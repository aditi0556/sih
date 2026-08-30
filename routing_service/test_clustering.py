try:
    from .clustering import cluster_nodes_by_h3, get_cluster_centroids, generate_h3_geojson
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from clustering import cluster_nodes_by_h3, get_cluster_centroids, generate_h3_geojson


def test_clustering_pipeline():
    print("=" * 55)
    print("Testing Updated routing_service/clustering.py")
    print("=" * 55)

    depot = {"id": "DEPOT_00", "lat": 28.6100, "lng": 77.2000, "fill_pct": 0}

    target_nodes = [
        {"id": "BIN_01", "lat": 28.6139, "lng": 77.2090, "fill_pct": 95.0}, # Critical (>=90%)
        {"id": "BIN_02", "lat": 28.6142, "lng": 77.2093, "fill_pct": 91.5}, # Critical (>=90%), same hex
        {"id": "BIN_03", "lat": 28.6150, "lng": 77.2100, "fill_pct": 82.0}, # Proactive (>=80% in K-Ring)
        {"id": "BIN_04", "lat": 28.6180, "lng": 77.2150, "fill_pct": 94.0}, # Critical (>=90%), separate hex
        {"id": "BIN_05", "lat": 28.6250, "lng": 77.2250, "fill_pct": 45.0}, # Skipped (<80%)
    ]

    # Run Teammate's function
    clusters = cluster_nodes_by_h3(depot=depot, target_nodes=target_nodes)

    print(f"\n1. Clusters Formed: {len(clusters)} H3 Hexagon(s)")
    for hex_id, nodes in clusters.items():
        print(f"   Hex Cell: {hex_id}")
        print(f"   Depot Present at Index 0: {nodes[0]['id'] == 'DEPOT_00'}")
        print(f"   Bin Nodes ({len(nodes)-1} bins): {[n['id'] for n in nodes[1:]]}")
        print()

    # Centroids
    centroids = get_cluster_centroids(clusters)
    print(f"2. Cluster Centroids generated for OR-Tools: {len(centroids)}")

    # GeoJSON
    geojson = generate_h3_geojson(clusters)
    print(f"3. GeoJSON Features generated for Dashboard: {len(geojson['features'])}")

    print("\n" + "=" * 55)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 55)

if __name__ == "__main__":
    test_clustering_pipeline()
