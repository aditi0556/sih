# Routing Service (Google OR-Tools + Uber H3)

This service processes predicted dustbin fill levels from the ML model, aggregates them into Uber H3 spatial clusters, and feeds optimized cluster nodes to Google OR-Tools for Vehicle Routing Problem (VRP) solving.

## Files Overview

* `h3_clustering.py`: Uber H3 Discrete Global Grid clustering engine.
  * **Resolution 9 (~100m hexes)**: Micro-clustering street dustbins.
  * **90% Fill Threshold**: Filters critical bins requiring immediate pickup.
  * **K-Ring Neighbor Sweep**: Scans 1-ring adjacent hexes for $\ge 80\%$ bins to include in proactive truck sweeps.
  * **Centroid Generator**: Computes cluster centroids (`centroid_lat`, `centroid_lng`) and aggregated demand volume for OR-Tools.
  * **GeoJSON Exporter**: Generates GeoJSON polygon features for frontend map dashboards.
* `test_h3_clustering.py`: Verification test script. Run with `python routing_service/test_h3_clustering.py`.

## Quick Usage in OR-Tools Service

```python
from h3_clustering import enrich_and_cluster_bins

# Input from ML / DB
raw_ml_predictions = [
    {"bin_id": "B1", "latitude": 28.6139, "longitude": 77.2090, "predicted_fill_pct": 95.0},
    {"bin_id": "B2", "latitude": 28.6142, "longitude": 77.2093, "predicted_fill_pct": 91.5},
]

# Run H3 enrichment & clustering
result = enrich_and_cluster_bins(raw_ml_predictions, resolution=9, critical_threshold=90.0)

# Input for OR-Tools Distance Matrix Solver:
clusters_for_ortools = result["or_tools_h3_clusters"]

# GeoJSON for Frontend Dashboard:
geojson_features = result["geojson"]
```
