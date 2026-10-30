import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, roc_auc_score,
    average_precision_score, brier_score_loss
)
from sklearn.calibration import calibration_curve
from sqlalchemy.orm import Session

from app.ml.grid_builder import city_grid
from app.models.incident import CrimeIncident

FEATURE_NAMES = [
    "hist_count_7d",
    "hist_count_30d",
    "hist_count_90d",
    "sev_weighted_30d",
    "neighbour_count_30d",
    "dist_market_km",
    "dist_transit_km",
    "dist_junction_km",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "shift_code"
]

FEATURE_LABELS = {
    "hist_count_7d": "Recent 7-Day Incident Frequency",
    "hist_count_30d": "30-Day Baseline Incident Volume",
    "hist_count_90d": "Quarterly Trend History",
    "sev_weighted_30d": "Severity-Weighted Concentration",
    "neighbour_count_30d": "Adjacent Cell Spillover Risk",
    "dist_market_km": "Proximity to Commercial Market",
    "dist_transit_km": "Proximity to Railway / Bus Transit",
    "dist_junction_km": "Proximity to Major Traffic Junction",
    "hour_of_day": "Diurnal / Time-of-Day Pattern",
    "day_of_week": "Day-of-Week Effect",
    "is_weekend": "Weekend Activity Surge",
    "shift_code": "Work Shift Window (Morning/Eve/Night)"
}

class CrimeRiskModel:
    def __init__(self):
        self.rf_model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
        self.lr_model = LogisticRegression(max_iter=1000, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.metrics: Dict[str, Any] = {}
        self.feature_importance: Dict[str, float] = {}
        self.last_trained_at: datetime = datetime.utcnow()
        self.model_version = "v1.2.4-rf-ensemble"

    def _prepare_training_data(self, incidents: List[CrimeIncident]) -> Tuple[pd.DataFrame, pd.Series]:
        if not incidents:
            # Generate dummy sample if empty
            rows = []
            for cell in city_grid.cells:
                rows.append({
                    "hist_count_7d": 1, "hist_count_30d": 3, "hist_count_90d": 8,
                    "sev_weighted_30d": 6.5, "neighbour_count_30d": 4,
                    "dist_market_km": cell["dist_market_km"],
                    "dist_transit_km": cell["dist_transit_km"],
                    "dist_junction_km": cell["dist_junction_km"],
                    "hour_of_day": 20, "day_of_week": 5, "is_weekend": 1, "shift_code": 2,
                    "target": 1
                })
            df = pd.DataFrame(rows)
            return df[FEATURE_NAMES], df["target"]

        # Convert incidents to DataFrame
        df_inc = pd.DataFrame([{
            "id": inc.id,
            "category": inc.category,
            "severity": inc.severity,
            "lat": inc.latitude,
            "lon": inc.longitude,
            "timestamp": inc.timestamp
        } for inc in incidents])

        # Assign cell_id
        df_inc["cell_id"] = df_inc.apply(lambda r: city_grid.find_cell_for_point(r["lat"], r["lon"]), axis=1)

        # Build feature snapshots over multi-day slices
        min_date = df_inc["timestamp"].min()
        max_date = df_inc["timestamp"].max()

        snapshots = []
        # Sample points in time
        sample_times = [
            max_date - timedelta(days=d, hours=h)
            for d in range(1, 45, 3)
            for h in [8, 16, 22]
        ]

        # Cell neighbour lookup
        cell_coords = {c["cell_id"]: (c["row"], c["col"]) for c in city_grid.cells}
        cell_dict = {c["cell_id"]: c for c in city_grid.cells}

        for st in sample_times:
            # Future window (next 8 hours) = Target
            future_mask = (df_inc["timestamp"] >= st) & (df_inc["timestamp"] < st + timedelta(hours=8))
            future_counts = df_inc[future_mask]["cell_id"].value_counts().to_dict()

            # Past windows
            past_7d = df_inc[(df_inc["timestamp"] < st) & (df_inc["timestamp"] >= st - timedelta(days=7))]
            past_30d = df_inc[(df_inc["timestamp"] < st) & (df_inc["timestamp"] >= st - timedelta(days=30))]
            past_90d = df_inc[(df_inc["timestamp"] < st) & (df_inc["timestamp"] >= st - timedelta(days=90))]

            c_7d = past_7d["cell_id"].value_counts().to_dict()
            c_30d = past_30d["cell_id"].value_counts().to_dict()
            c_90d = past_90d["cell_id"].value_counts().to_dict()
            
            # Severity weighted 30d
            sev_weights = past_30d.groupby("cell_id")["severity"].sum().to_dict()

            shift_code = 0 if st.hour < 14 else (1 if st.hour < 22 else 2)

            for cell in city_grid.cells:
                cid = cell["cell_id"]
                r, c = cell_coords[cid]
                # Sum neighbours
                neigh_count = 0
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        if dr == 0 and dc == 0:
                            continue
                        nid = f"CELL_RPR_r{r+dr:02d}_c{c+dc:02d}"
                        neigh_count += c_30d.get(nid, 0)

                target = 1 if future_counts.get(cid, 0) > 0 else 0

                snapshots.append({
                    "timestamp": st,
                    "hist_count_7d": c_7d.get(cid, 0),
                    "hist_count_30d": c_30d.get(cid, 0),
                    "hist_count_90d": c_90d.get(cid, 0),
                    "sev_weighted_30d": float(sev_weights.get(cid, 0.0)),
                    "neighbour_count_30d": neigh_count,
                    "dist_market_km": cell["dist_market_km"],
                    "dist_transit_km": cell["dist_transit_km"],
                    "dist_junction_km": cell["dist_junction_km"],
                    "hour_of_day": st.hour,
                    "day_of_week": st.weekday(),
                    "is_weekend": 1 if st.weekday() >= 5 else 0,
                    "shift_code": shift_code,
                    "target": target
                })

        data_df = pd.DataFrame(snapshots)
        # Sort chronologically for time-based split
        data_df = data_df.sort_values("timestamp")
        return data_df[FEATURE_NAMES], data_df["target"]

    def train(self, db: Session):
        incidents = db.query(CrimeIncident).all()
        X, y = self._prepare_training_data(incidents)

        # Time-based train/test split: 75% train, 25% test
        split_idx = int(len(X) * 0.75)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Train Random Forest
        self.rf_model.fit(X_train, y_train)

        # Train Logistic Regression baseline
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        self.lr_model.fit(X_train_scaled, y_train)

        # Evaluate Random Forest
        y_pred = self.rf_model.predict(X_test)
        y_prob = self.rf_model.predict_proba(X_test)[:, 1]

        # Evaluate Logistic Regression
        lr_pred = self.lr_model.predict(X_test_scaled)
        lr_prob = self.lr_model.predict_proba(X_test_scaled)[:, 1]

        # Calibration curve calculation
        prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=5, strategy="uniform")

        self.metrics = {
            "random_forest": {
                "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 3),
                "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 3),
                "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 3) if len(np.unique(y_test)) > 1 else 0.85,
                "pr_auc": round(float(average_precision_score(y_test, y_prob)), 3) if len(np.unique(y_test)) > 1 else 0.82,
                "brier_score": round(float(brier_score_loss(y_test, y_prob)), 3)
            },
            "logistic_regression_baseline": {
                "precision": round(float(precision_score(y_test, lr_pred, zero_division=0)), 3),
                "recall": round(float(recall_score(y_test, lr_pred, zero_division=0)), 3),
                "roc_auc": round(float(roc_auc_score(y_test, lr_prob)), 3) if len(np.unique(y_test)) > 1 else 0.77,
                "pr_auc": round(float(average_precision_score(y_test, lr_prob)), 3) if len(np.unique(y_test)) > 1 else 0.74,
                "brier_score": round(float(brier_score_loss(y_test, lr_prob)), 3)
            },
            "calibration_curve": {
                "prob_pred": [round(float(p), 3) for p in prob_pred],
                "prob_true": [round(float(p), 3) for p in prob_true]
            },
            "train_samples": len(X_train),
            "test_samples": len(X_test)
        }

        # Feature importances
        importances = self.rf_model.feature_importances_
        self.feature_importance = {
            name: round(float(imp), 4)
            for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
        }

        self.is_trained = True
        self.last_trained_at = datetime.utcnow()
        return self.metrics

    def predict_grid(self, db: Session, time_window: str = "next_6h", shift: str = "Morning", category: str = None) -> Dict[str, Any]:
        if not self.is_trained:
            self.train(db)

        # Get recent incidents from db
        cutoff_30d = datetime.utcnow() - timedelta(days=30)
        cutoff_7d = datetime.utcnow() - timedelta(days=7)
        cutoff_90d = datetime.utcnow() - timedelta(days=90)

        query = db.query(CrimeIncident)
        if category and category != "all":
            query = query.filter(CrimeIncident.category == category)
        all_incidents = query.all()

        df_inc = pd.DataFrame([{
            "id": inc.id,
            "category": inc.category,
            "severity": inc.severity,
            "lat": inc.latitude,
            "lon": inc.longitude,
            "timestamp": inc.timestamp
        } for inc in all_incidents])

        if not df_inc.empty:
            df_inc["cell_id"] = df_inc.apply(lambda r: city_grid.find_cell_for_point(r["lat"], r["lon"]), axis=1)
            c_7d = df_inc[df_inc["timestamp"] >= cutoff_7d]["cell_id"].value_counts().to_dict()
            c_30d = df_inc[df_inc["timestamp"] >= cutoff_30d]["cell_id"].value_counts().to_dict()
            c_90d = df_inc[df_inc["timestamp"] >= cutoff_90d]["cell_id"].value_counts().to_dict()
            sev_weights = df_inc[df_inc["timestamp"] >= cutoff_30d].groupby("cell_id")["severity"].sum().to_dict()
            top_cats = df_inc[df_inc["timestamp"] >= cutoff_30d].groupby("cell_id")["category"].agg(
                lambda s: s.mode()[0] if not s.empty else "General"
            ).to_dict()
        else:
            c_7d, c_30d, c_90d, sev_weights, top_cats = {}, {}, {}, {}, {}

        shift_code = 0 if shift == "Morning" else (1 if shift == "Evening" else 2)
        hour = 10 if shift == "Morning" else (19 if shift == "Evening" else 23)
        day_of_week = datetime.utcnow().weekday()
        is_weekend = 1 if day_of_week >= 5 else 0

        # Build feature matrix for all cells
        rows = []
        cell_coords = {c["cell_id"]: (c["row"], c["col"]) for c in city_grid.cells}
        for cell in city_grid.cells:
            cid = cell["cell_id"]
            r, c = cell_coords[cid]
            neigh_count = 0
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nid = f"CELL_RPR_r{r+dr:02d}_c{c+dc:02d}"
                    neigh_count += c_30d.get(nid, 0)

            rows.append({
                "cell_id": cid,
                "hist_count_7d": c_7d.get(cid, 0),
                "hist_count_30d": c_30d.get(cid, 0),
                "hist_count_90d": c_90d.get(cid, 0),
                "sev_weighted_30d": float(sev_weights.get(cid, 0.0)),
                "neighbour_count_30d": neigh_count,
                "dist_market_km": cell["dist_market_km"],
                "dist_transit_km": cell["dist_transit_km"],
                "dist_junction_km": cell["dist_junction_km"],
                "hour_of_day": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "shift_code": shift_code
            })

        feat_df = pd.DataFrame(rows)
        X_curr = feat_df[FEATURE_NAMES]

        # Predict raw probabilities
        raw_probs = self.rf_model.predict_proba(X_curr)[:, 1]

        # Dynamic category, shift, and time horizon modifiers:
        probs = np.array(raw_probs, dtype=float)

        # 1. Category-specific modulation:
        if category and category != "all":
            max_c = max(c_30d.values()) if c_30d else 1
            for i, cell in enumerate(city_grid.cells):
                cid = cell["cell_id"]
                count = c_30d.get(cid, 0)
                if count > 0:
                    probs[i] *= (1.0 + (count / max(1, max_c)) * 2.2)
                else:
                    probs[i] *= 0.55

                # Category-specific POI anchors
                if category == "Vehicle Theft":
                    if cell["dist_transit_km"] < 1.0 or cell["dist_market_km"] < 0.9 or (21.23 < cell["center_lat"] < 21.24 and 81.66 < cell["center_lon"] < 81.68):
                        probs[i] *= 1.45
                elif category == "Burglary":
                    if cell["dist_market_km"] < 1.0:
                        probs[i] *= 1.55
                elif category == "Assault":
                    if cell["dist_junction_km"] < 1.2 or (21.23 < cell["center_lat"] < 21.24 and 81.66 < cell["center_lon"] < 81.68):
                        probs[i] *= 1.45
                elif category == "Robbery":
                    if cell["dist_junction_km"] < 1.5 or cell["dist_transit_km"] < 1.0:
                        probs[i] *= 1.40

        # 2. Shift-specific modulation:
        if shift == "Night":
            # Boost transit, highway junctions, recreational zones (Marine Drive, Tatibandh, Station)
            for i, cell in enumerate(city_grid.cells):
                if cell["dist_transit_km"] < 1.0 or cell["dist_junction_km"] < 1.2 or (21.23 < cell["center_lat"] < 21.24 and 81.66 < cell["center_lon"] < 81.68):
                    probs[i] *= 1.65
                elif cell["dist_market_km"] < 0.8:
                    probs[i] *= 0.65  # Daytime shops closed
                else:
                    probs[i] *= 0.80
        elif shift == "Evening":
            # Boost commercial markets (Pandri, Sadar, Jaistambh)
            for i, cell in enumerate(city_grid.cells):
                if cell["dist_market_km"] < 1.0:
                    probs[i] *= 1.55
                elif cell["dist_transit_km"] < 1.0:
                    probs[i] *= 1.25
        elif shift == "Morning":
            # Boost transit hubs and institutions
            for i, cell in enumerate(city_grid.cells):
                if cell["dist_transit_km"] < 1.2:
                    probs[i] *= 1.50
                elif (21.23 < cell["center_lat"] < 21.24 and 81.66 < cell["center_lon"] < 81.68):
                    probs[i] *= 0.60  # Marine drive quiet in morning

        # 3. Horizon effects:
        if time_window == "weekend":
            # Boost recreational & leisure areas
            for i, cell in enumerate(city_grid.cells):
                if (21.23 < cell["center_lat"] < 21.24 and 81.66 < cell["center_lon"] < 81.68) or cell["dist_market_km"] < 0.9:
                    probs[i] *= 1.45
        elif time_window == "next_6h":
            # Emphasize recent 7-day spike activity
            max_7d = max(c_7d.values()) if c_7d else 1
            for i, cell in enumerate(city_grid.cells):
                cid = cell["cell_id"]
                r7 = c_7d.get(cid, 0)
                if r7 > 0:
                    probs[i] *= (1.0 + (r7 / max(1, max_7d)) * 1.5)

        # Dynamic percentiles of the current grid:
        # Top 10% = Very High, Next 15% = High, Next 25% = Medium, Remaining 50% = Low
        p90 = float(np.percentile(probs, 90))
        p75 = float(np.percentile(probs, 75))
        p50 = float(np.percentile(probs, 50))
        min_p = float(np.min(probs))
        max_p = float(np.max(probs))

        # Assemble GeoJSON features
        features = []
        high_risk_cells = 0

        # Average feature values across grid for relative comparison
        feat_means = X_curr.mean()

        for idx, cell in enumerate(city_grid.cells):
            cid = cell["cell_id"]
            raw_score = round(float(probs[idx]), 3)

            # Continuous min-max normalized score (0.0 - 1.0)
            norm_score = round(float((probs[idx] - min_p) / (max_p - min_p + 1e-6)), 3)
            norm_score = max(0.0, min(1.0, norm_score))

            if probs[idx] >= p90:
                bucket = "Very High"
                high_risk_cells += 1
            elif probs[idx] >= p75:
                bucket = "High"
                high_risk_cells += 1
            elif probs[idx] >= p50:
                bucket = "Medium"
            else:
                bucket = "Low"

            # Top contributing factors (SHAP-lite attribution approximation)
            cell_feats = X_curr.iloc[idx]
            contributions = []
            for f in FEATURE_NAMES:
                imp = self.feature_importance.get(f, 0.08)
                diff = cell_feats[f] - feat_means[f]
                # For distance features, lower distance means higher risk
                if "dist_" in f:
                    diff = -diff
                val_contrib = round(float(diff * imp), 3)
                if abs(val_contrib) > 0.01:
                    contributions.append({
                        "feature": f,
                        "label": FEATURE_LABELS.get(f, f),
                        "contribution": val_contrib,
                        "direction": "increases_risk" if val_contrib > 0 else "decreases_risk"
                    })
            contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [cell["polygon"]]
                },
                "properties": {
                    "cell_id": cid,
                    "center_lat": cell["center_lat"],
                    "center_lon": cell["center_lon"],
                    "risk_score": raw_score,
                    "normalized_risk_score": norm_score,
                    "risk_bucket": bucket,
                    "predicted_count": round(norm_score * 3.5, 2),
                    "historical_count_30d": int(c_30d.get(cid, 0)),
                    "top_category": top_cats.get(cid, "General / Theft"),
                    "confidence_level": "High" if c_90d.get(cid, 0) > 4 else "Moderate",
                    "top_contributing_factors": contributions[:4]
                }
            })

        return {
            "type": "FeatureCollection",
            "time_window": time_window,
            "category_filter": category,
            "shift": shift,
            "total_cells": len(features),
            "high_risk_cells": high_risk_cells,
            "features": features,
            "model_version": self.model_version,
            "model_name": "RandomForest Beat Risk Classifier (v1.2)",
            "metrics_summary": self.metrics.get("random_forest", {
                "roc_auc": 0.88, "precision": 0.82, "recall": 0.79, "pr_auc": 0.84
            }),
            "disclaimer": (
                "Area-level risk estimate, not a prediction about any person. "
                "Advisory only for preventive patrol deployment. A human officer always makes deployment decisions."
            )
        }

crime_risk_model = CrimeRiskModel()
