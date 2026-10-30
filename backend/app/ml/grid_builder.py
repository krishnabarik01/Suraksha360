import math
from typing import List, Dict, Any
from app.config import settings

# Key landmarks in Raipur for feature distance computation
RAIPUR_POIS = [
    {"name": "Jaistambh Chowk Market", "lat": 21.2497, "lon": 81.6335, "type": "market"},
    {"name": "Pandri Cloth Market", "lat": 21.2588, "lon": 81.6540, "type": "market"},
    {"name": "Raipur Railway Station", "lat": 21.2612, "lon": 81.6288, "type": "transit"},
    {"name": "Old Pandri Bus Stand", "lat": 21.2540, "lon": 81.6490, "type": "transit"},
    {"name": "Tatibandh Ring Road Junction", "lat": 21.2590, "lon": 81.5710, "type": "junction"},
    {"name": "Pachpedi Naka Junction", "lat": 21.2185, "lon": 81.6515, "type": "junction"},
    {"name": "Telibandha Marine Drive", "lat": 21.2355, "lon": 81.6702, "type": "recreational"}
]

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class CityGrid:
    def __init__(self,
                 min_lat: float = settings.BOUNDS_MIN_LAT,
                 max_lat: float = settings.BOUNDS_MAX_LAT,
                 min_lon: float = settings.BOUNDS_MIN_LON,
                 max_lon: float = settings.BOUNDS_MAX_LON,
                 cell_size_km: float = settings.GRID_CELL_SIZE_KM):
        self.min_lat = min_lat
        self.max_lat = max_lat
        self.min_lon = min_lon
        self.max_lon = max_lon
        self.cell_size_km = cell_size_km

        # ~111 km per latitude degree
        self.lat_step = cell_size_km / 111.0
        # Longitude degree length varies by cos(lat)
        avg_lat = (min_lat + max_lat) / 2.0
        self.lon_step = cell_size_km / (111.0 * math.cos(math.radians(avg_lat)))

        self.cells = self._generate_cells()

    def _generate_cells(self) -> List[Dict[str, Any]]:
        cells = []
        r = 0
        lat = self.min_lat
        while lat < self.max_lat:
            c = 0
            lon = self.min_lon
            while lon < self.max_lon:
                cell_id = f"CELL_RPR_r{r:02d}_c{c:02d}"
                c_lat = lat + self.lat_step / 2.0
                c_lon = lon + self.lon_step / 2.0

                # Compute min distance to POIs
                dist_market = min(haversine_distance_km(c_lat, c_lon, p["lat"], p["lon"]) for p in RAIPUR_POIS if p["type"] == "market")
                dist_transit = min(haversine_distance_km(c_lat, c_lon, p["lat"], p["lon"]) for p in RAIPUR_POIS if p["type"] == "transit")
                dist_junction = min(haversine_distance_km(c_lat, c_lon, p["lat"], p["lon"]) for p in RAIPUR_POIS if p["type"] == "junction")

                polygon = [
                    [round(lon, 6), round(lat, 6)],
                    [round(lon + self.lon_step, 6), round(lat, 6)],
                    [round(lon + self.lon_step, 6), round(lat + self.lat_step, 6)],
                    [round(lon, 6), round(lat + self.lat_step, 6)],
                    [round(lon, 6), round(lat, 6)]
                ]

                cells.append({
                    "cell_id": cell_id,
                    "row": r,
                    "col": c,
                    "center_lat": round(c_lat, 6),
                    "center_lon": round(c_lon, 6),
                    "polygon": polygon,
                    "dist_market_km": round(dist_market, 2),
                    "dist_transit_km": round(dist_transit, 2),
                    "dist_junction_km": round(dist_junction, 2)
                })
                lon += self.lon_step
                c += 1
            lat += self.lat_step
            r += 1
        return cells

    def find_cell_for_point(self, lat: float, lon: float) -> str:
        for cell in self.cells:
            poly = cell["polygon"]
            # Simple bounding box test
            if (poly[0][1] <= lat <= poly[2][1] and
                poly[0][0] <= lon <= poly[1][0]):
                return cell["cell_id"]
        # Fallback closest
        closest = min(self.cells, key=lambda c: (c["center_lat"] - lat)**2 + (c["center_lon"] - lon)**2)
        return closest["cell_id"]

city_grid = CityGrid()
