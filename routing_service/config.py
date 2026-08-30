class RoutingConfig:
    STANDARD_BIN_DEMAND = 100
    HIGH_CAP_BIN_DEMAND = 200
    HOTSPOT_DEMAND = 100  
    TRUCK_MAX_CAPACITY = 2000
    SAFETY_BUFFER_PCT = 0.15 
    EFFECTIVE_TRUCK_CAPACITY = int(TRUCK_MAX_CAPACITY * (1 - SAFETY_BUFFER_PCT)) 
    DEPOT_INDEX = 0 
    MAX_TRUCKS_PER_CLUSTER = 5
    MAX_SHIFT_DURATION_SEC = 28800 
    STOP_SERVICE_TIME_SEC = 600    

    H3_RESOLUTION = 8  

    SOLVER_TIME_LIMIT_SEC = 5

    OSRM_TABLE_URL = "http://router.project-osrm.org/table/v1/driving/"
    OSRM_ROUTE_URL = "http://router.project-osrm.org/route/v1/driving/"