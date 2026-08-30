def calculate_reliability(params: dict) -> int:
    score = 100.0
    
    # Nominal bands: (min_nom, max_nom, penalty_weight_per_unit_deviation)
    nominal_bands = {
        "rpm": (4200, 5200, 0.02),
        "cht": (90, 125, 0.5),
        "egt": (750, 860, 0.1),
        "oil_pressure": (300, 480, 0.15),
        "oil_temp": (80, 105, 0.8),
        "fuel_flow": (15.0, 22.0, 1.5),
        "map": (90, 112, 0.4),
        "vibration": (0.2, 1.6, 12.0),
        "voltage": (13.2, 15.0, 5.0),
        "afr": (13.8, 15.4, 6.0),
    }
    
    for key, (min_val, max_val, weight) in nominal_bands.items():
        if key in params:
            val = params[key]
            if val < min_val:
                deviation = min_val - val
                score -= deviation * weight
            elif val > max_val:
                deviation = val - max_val
                score -= deviation * weight
                
    return max(10, min(100, int(round(score))))
