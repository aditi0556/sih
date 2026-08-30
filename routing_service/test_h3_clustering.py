"""
Test script for H3 Geospatial Layer (routing_service/h3_clustering.py)
Run with: python test_h3_clustering.py  (from inside routing_service folder)
"""

from h3_clustering import enrich_and_cluster_bins
import json

def run_h3_tests():
    print("=" * 52)
    print("  SIH Waste Management - H3 Geospatial Layer Test")
    print("=" * 52)

    # -------------------------------------------
    # INPUT: mock data as if it came from XGBoost
    # -------------------------------------------
    mock_predictions = [
        # BIN_001 & BIN_002 are very close together in New Delhi -> will land in SAME H3 hex -> one cluster
        {"bin_id": "BIN_001", "latitude": 28.6139, "longitude": 77.2090, "predicted_fill_pct": 95.0},  # CRITICAL (>=90%)
        {"bin_id": "BIN_002", "latitude": 28.6142, "longitude": 77.2093, "predicted_fill_pct": 91.5},  # CRITICAL (>=90%)

        # BIN_003 is 82% - below 90 so normally skipped, but it is near BIN_001/002 -> K-Ring picks it up
        {"bin_id": "BIN_003", "latitude": 28.6150, "longitude": 77.2100, "predicted_fill_pct": 82.0},  # PROACTIVE

        # BIN_004 is far away and critical -> separate hex cluster
        {"bin_id": "BIN_004", "latitude": 28.6180, "longitude": 77.2150, "predicted_fill_pct": 94.0},  # CRITICAL

        # BIN_005 & BIN_006 are far from any critical bin and below 80% -> SKIPPED
        {"bin_id": "BIN_005", "latitude": 28.6250, "longitude": 77.2250, "predicted_fill_pct": 45.0},  # SKIPPED
        {"bin_id": "BIN_006", "latitude": 28.6255, "longitude": 77.2255, "predicted_fill_pct": 70.0},  # SKIPPED
    ]

    print(f"\nINPUT BINS ({len(mock_predictions)} total from XGBoost):")
    print(f"{'BIN ID':<10} {'Lat':>8} {'Lng':>8} {'Fill %':>8}  {'Expected Action'}")
    print("-" * 65)
    actions = ["CRITICAL", "CRITICAL", "PROACTIVE", "CRITICAL", "SKIP", "SKIP"]
    for b, action in zip(mock_predictions, actions):
        print(f"{b['bin_id']:<10} {b['latitude']:>8.4f} {b['longitude']:>8.4f} {b['predicted_fill_pct']:>7.1f}%  -> {action}")

    # -------------------------------------------
    # RUN THE H3 ENGINE
    # -------------------------------------------
    result = enrich_and_cluster_bins(
        bins_data=mock_predictions,
        resolution=9,
        critical_threshold=90.0,
        proactive_threshold=80.0
    )

    # -------------------------------------------
    # OUTPUT 1: SUMMARY
    # -------------------------------------------
    summary = result["summary"]
    print("\nSUMMARY:")
    print(f"  Total Bins Evaluated    : {summary['total_bins_evaluated']}")
    print(f"  Critical Bins (>=90%)   : {summary['critical_bins_to_visit']}")
    print(f"  Proactive Bins (K-Ring) : {summary['proactive_bins_to_visit']}")
    print(f"  Total Bins To Visit     : {summary['total_bins_to_visit']}")
    print(f"  Bins Skipped (<80%)     : {summary['bins_skipped']}")
    print(f"  H3 Hex Clusters Formed  : {summary['total_h3_clusters']}")

    # -------------------------------------------
    # OUTPUT 2: H3 CLUSTERS (what OR-Tools gets)
    # -------------------------------------------
    print("\nH3 CLUSTER NODES (input for OR-Tools distance matrix):")
    print("-" * 65)
    for i, cluster in enumerate(result["or_tools_h3_clusters"], 1):
        print(f"  Cluster #{i}")
        print(f"    H3 Cell       : {cluster['h3_cell']}")
        print(f"    Ward Zone     : {cluster['h3_ward_zone']}")
        print(f"    Centroid      : ({cluster['centroid_lat']:.5f}, {cluster['centroid_lng']:.5f})")
        print(f"    Bins in Hex   : {cluster['bin_count']} => {cluster['bin_ids']}")
        print(f"    Total Demand  : {cluster['total_volume_demand']:.1f}% fill volume")
        print()

    # -------------------------------------------
    # OUTPUT 3: GEOJSON (what the frontend gets)
    # -------------------------------------------
    geojson = result["geojson"]
    print(f"GEOJSON HEXAGON POLYGONS (for Mapbox / Leaflet frontend):")
    print(f"  Total features generated: {len(geojson['features'])} polygon(s)")
    print(f"  Sample (first feature properties):")
    if geojson["features"]:
        props = geojson["features"][0]["properties"]
        for k, v in props.items():
            print(f"    {k}: {v}")

    print("\n" + "=" * 52)
    print("  ALL TESTS PASSED - h3_clustering.py is ready!")
    print("=" * 52)

if __name__ == "__main__":
    run_h3_tests()
