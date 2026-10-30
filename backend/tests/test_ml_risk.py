import pytest
from app.db import SessionLocal
from app.ml.grid_builder import city_grid
from app.ml.risk_model import crime_risk_model

def test_city_grid_generation():
    assert len(city_grid.cells) > 20
    first_cell = city_grid.cells[0]
    assert "cell_id" in first_cell
    assert "center_lat" in first_cell
    assert "dist_market_km" in first_cell
    assert len(first_cell["polygon"]) == 5

def test_risk_prediction_output():
    db = SessionLocal()
    try:
        grid_result = crime_risk_model.predict_grid(db, time_window="next_6h", shift="Morning")
        assert grid_result["type"] == "FeatureCollection"
        assert grid_result["total_cells"] > 20
        assert "disclaimer" in grid_result
        assert "not a prediction about any person" in grid_result["disclaimer"]

        # Check features
        features = grid_result["features"]
        first_feat = features[0]
        props = first_feat["properties"]
        assert 0.0 <= props["risk_score"] <= 1.0
        assert props["risk_bucket"] in ["Low", "Medium", "High", "Very High"]
        assert len(props["top_contributing_factors"]) > 0
    finally:
        db.close()
