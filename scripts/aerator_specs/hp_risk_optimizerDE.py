import numpy as np
from scipy.optimize import differential_evolution

# General Parameters
POND_AREA = 1000.0
POND_DEPTH = 1.5
POND_VOLUME = POND_AREA * 10000 * POND_DEPTH
NUM_PONDS = int(POND_VOLUME / 75)
TOTAL_O2_DEMAND_PER_POND = 131.4  # kg O₂/year for 4.8 mg/L daily
TOTAL_O2_DEMAND = TOTAL_O2_DEMAND_PER_POND * NUM_PONDS
DAILY_HOURS = 8
YEARLY_HOURS = 2920

# HP Configurations
HP_CONFIGS = {
    'Small': {'HP': 1.5, 'Cost_Factor': 1.0},
    'Medium': {'HP': 3.0, 'Cost_Factor': 1.5},
    'Large': {'HP': 6.0, 'Cost_Factor': 2.5}
}

# Shrimp Parameters
DO_SATURATION = 8.0
DO_THRESHOLD = 4.0
BASE_MORTALITY = 0.3
MAX_MORTALITY_INCREASE = 0.0  # No additional mortality allowed

# Oxygen Targets and Cap
TARGET_O2_DELIVERY = 26280000.0
O2_DELIVERY_CAP = TARGET_O2_DELIVERY * 1.2

# Oxygen Delivery per HP
O2_PER_HP = TOTAL_O2_DEMAND_PER_POND / (YEARLY_HOURS * 3.0)  # ~0.015 kg O₂/hour per HP

# Calculate DO concentration
def calculate_do_concentration(o2_delivered, pond_volume=75.0):
    o2_mg = (o2_delivered * 1e6) / YEARLY_HOURS
    pond_liters = pond_volume * 1000
    do_mg_per_l = o2_mg / pond_liters
    return do_mg_per_l * DAILY_HOURS

# Calculate penalties
def calculate_penalties(hp_units, o2_delivered_per_pond, total_hp_per_pond):
    penalty = 0
    mortality_increase = 0
    
    do_concentration = calculate_do_concentration(o2_delivered_per_pond)
    
    if do_concentration < DO_THRESHOLD:
        shortfall = DO_THRESHOLD - do_concentration
        penalty += 1000 * shortfall
        mortality_increase += 0.1 * shortfall
    
    if total_hp_per_pond > 0 and sum(hp_units) > 0:
        max_hp_unit = max([HP_CONFIGS[hp_config]['HP'] for i, hp_config in enumerate(HP_CONFIGS.keys()) if hp_units[i] > 0 for _ in range(hp_units[i])], default=0)
        failed_o2 = (max_hp_unit / total_hp_per_pond) * o2_delivered_per_pond
        new_o2 = o2_delivered_per_pond - failed_o2
        new_do = calculate_do_concentration(new_o2)
        if new_do < DO_THRESHOLD:
            shortfall = DO_THRESHOLD - new_do
            penalty += 500 * shortfall
            mortality_increase += 0.05 * shortfall
    
    # Enforce 0% mortality increase
    if mortality_increase > MAX_MORTALITY_INCREASE:
        penalty += 1e9 * (mortality_increase - MAX_MORTALITY_INCREASE)
        mortality_increase = MAX_MORTALITY_INCREASE
    
    return penalty, mortality_increase

# Objective Function
def hp_objective(hp_units):
    hp_units = [round(u) for u in hp_units]
    
    o2_delivered_per_pond = 0
    total_hp_per_pond = 0
    total_cost = 0
    for i, hp_config in enumerate(HP_CONFIGS.keys()):
        units = hp_units[i]
        hp = HP_CONFIGS[hp_config]['HP']
        cost_factor = HP_CONFIGS[hp_config]['Cost_Factor']
        o2_delivered_per_pond += units * hp * O2_PER_HP * YEARLY_HOURS
        total_hp_per_pond += units * hp
        total_cost += units * hp * cost_factor * 1000
    
    o2_delivered = o2_delivered_per_pond * NUM_PONDS
    
    if o2_delivered < TOTAL_O2_DEMAND:
        shortfall = (TOTAL_O2_DEMAND - o2_delivered) / TARGET_O2_DELIVERY
        shortfall_penalty = 1e9 * shortfall
    else:
        shortfall_penalty = 0
    
    if o2_delivered > O2_DELIVERY_CAP:
        excess = (o2_delivered - O2_DELIVERY_CAP) / TARGET_O2_DELIVERY
        excess_penalty = 1e8 * excess
    else:
        excess_penalty = 0
    
    o2_deviation = abs(o2_delivered - TARGET_O2_DELIVERY) / TARGET_O2_DELIVERY
    target_penalty = 1e7 * o2_deviation
    
    risk_penalty, mortality_increase = calculate_penalties(hp_units, o2_delivered_per_pond, total_hp_per_pond)
    
    total_penalty = (
        1.0 * risk_penalty +
        1.0 * shortfall_penalty +
        0.5 * excess_penalty +
        0.5 * target_penalty +
        0.3 * total_cost
    )
    
    return total_penalty

# Optimization Bounds
bounds_hp = [(0, 10), (0, 10), (0, 10)]  # Increased to allow redundancy

# Run Differential Evolution
result = differential_evolution(hp_objective, bounds_hp, maxiter=1000, popsize=15)
hp_units = [round(u) for u in result.x]

# Output Results
print("Optimal HP Configuration (Risk and Aeration Supply per Pond):")
for i, hp_config in enumerate(HP_CONFIGS.keys()):
    print(f"{hp_config}: {hp_units[i]} units")

o2_delivered_per_pond = 0
total_hp_per_pond = 0
total_cost = 0
for i, hp_config in enumerate(HP_CONFIGS.keys()):
    units = hp_units[i]
    hp = HP_CONFIGS[hp_config]['HP']
    cost_factor = HP_CONFIGS[hp_config]['Cost_Factor']
    o2_delivered_per_pond += units * hp * O2_PER_HP * YEARLY_HOURS
    total_hp_per_pond += units * hp
    total_cost += units * hp * cost_factor * 1000
o2_delivered = o2_delivered_per_pond * NUM_PONDS

penalty, mortality_increase = calculate_penalties(hp_units, o2_delivered_per_pond, total_hp_per_pond)
mortality = BASE_MORTALITY + mortality_increase

print(f"\nTotal Oxygen Delivered: {o2_delivered:.2f} kg O₂/year")
print(f"Target Oxygen Demand: {TOTAL_O2_DEMAND:.2f} kg O₂/year")
print(f"Oxygen Delivery Cap: {O2_DELIVERY_CAP:.2f} kg O₂/year")
print(f"Total HP per Pond: {total_hp_per_pond:.2f}")
print(f"Estimated Cost Proxy: ${total_cost * NUM_PONDS:.2f}")
print(f"Penalty: ${penalty * NUM_PONDS:.2f}")
print(f"Mortality Increase: {mortality_increase:.2%}")
print(f"Total Mortality: {mortality:.2%}")
print(f"DO Concentration: {calculate_do_concentration(o2_delivered_per_pond):.2f} mg/L")