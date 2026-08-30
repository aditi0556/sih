# routing_service/vrp_solver.py
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from typing import List, Dict, Tuple, Optional
from .config import RoutingConfig

def solve_cvrp(distance_matrix: List[List[int]], demands: List[int]) -> Tuple[Optional[pywrapcp.RoutingIndexManager], Optional[pywrapcp.RoutingModel], Optional[pywrapcp.Assignment]]:
    num_nodes = len(distance_matrix)
    if num_nodes <= 1:
        return None, None, None

    num_vehicles = min(RoutingConfig.MAX_TRUCKS_PER_CLUSTER, num_nodes - 1)

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, RoutingConfig.DEPOT_INDEX)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  
        [RoutingConfig.EFFECTIVE_TRUCK_CAPACITY] * num_vehicles,
        True,  
        "Capacity"
    )

    # NEW: Force the solver to minimize the number of trucks used!
    routing.SetFixedCostOfAllVehicles(100000)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = RoutingConfig.SOLVER_TIME_LIMIT_SEC

    solution = routing.SolveWithParameters(search_parameters)
    return manager, routing, solution