import numpy as np
from scipy.optimize import linprog
import ipywidgets as widgets
from IPython.display import display, clear_output
import matplotlib.pyplot as plt
import os
from datetime import datetime
from sae_sotr_calculator import ShrimpPondCalculator
from tabulate import tabulate

# Classes from aerator_depreciation_calculator.py
class Aerator:
    """Class representing an aeration device with cost and performance attributes."""
    def __init__(self, name, hp, capital_cost, useful_life, repair_cost, operating_cost_per_hour, do_rate):
        self.name = name
        self.hp = hp
        self.capital_cost = capital_cost
        self.useful_life = useful_life
        self.repair_cost = repair_cost
        self.operating_cost_per_hour = operating_cost_per_hour
        self.do_rate = do_rate  # kg of DO per hour
        self.depreciation_cost = self.calculate_depreciation()

    def calculate_depreciation(self):
        """Calculate annual depreciation cost using straight-line method."""
        return self.capital_cost / self.useful_life

    def total_cost(self, hours):
        """Calculate total annual cost for given hours of operation."""
        return self.depreciation_cost + (self.operating_cost_per_hour * hours) + self.repair_cost

    def do_output(self, hours):
        """Calculate total DO output for given hours."""
        return self.do_rate * hours

class AerationOptimizer:
    """Class to optimize aeration device selection using linear programming."""
    def __init__(self, aerators, min_do_required, hours):
        self.aerators = aerators
        self.min_do_required = min_do_required
        self.hours = hours

    def setup_optimization(self):
        """Set up the linear programming problem."""
        c = [aerator.total_cost(self.hours) for aerator in self.aerators]
        A = [-aerator.do_output(self.hours) for aerator in self.aerators]  # Negative for >= constraint
        b = [-self.min_do_required]
        bounds = [(0, None) for _ in self.aerators]
        return c, [A], b, bounds

    def optimize(self):
        """Run optimization to minimize total cost."""
        c, A_ub, b_ub, bounds = self.setup_optimization()
        result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')
        
        if result.success:
            return {
                "optimal_cost": result.fun,
                "aerator_usage": {self.aerators[i].name: result.x[i] for i in range(len(self.aerators))},
                "depreciation_cost": sum(self.aerators[i].depreciation_cost * result.x[i] for i in range(len(self.aerators)))
            }
        else:
            return {"status": "Optimization failed", "message": result.message}

# Initial aerator data with aging parameters
initial_aerators = [
    {"name": "Beraqua (New)", "hp": 3, "capital_cost": 1200, "useful_life": 6, "repair_cost": 200, "operating_cost_per_hour": 0.45, "t10": 1, "t70": 8},
    {"name": "Beraqua (Mid)", "hp": 3, "capital_cost": 1000, "useful_life": 4, "repair_cost": 400, "operating_cost_per_hour": 0.50, "t10": 2, "t70": 10},
    {"name": "Beraqua (Old)", "hp": 3, "capital_cost": 800, "useful_life": 2, "repair_cost": 600, "operating_cost_per_hour": 0.55, "t10": 3, "t70": 12}
]

# Helper function from offset_model_torque_hp.py
def truncate_to_2_decimals(value):
    """Truncate float to 2 decimal places without rounding"""
    return float(f"{value:.2f}"[:f"{value:.2f}".index('.') + 3])

# Integrated financial model
def create_integrated_interface():
    calculator = ShrimpPondCalculator(
        "/home/luisvinatea/Dev/Repos/Aquaculture/data/raw/json/o2_temp_sal_100_sat.json"
    )
    
    # Global widgets
    temperature_widget = widgets.FloatSlider(value=28, min=20, max=35, step=0.1, description="Temperature (°C):", style={'description_width': 'initial'})
    salinity_widget = widgets.FloatSlider(value=30, min=0, max=40, step=1, description="Salinity (‰):", style={'description_width': 'initial'})
    kwh_price_widget = widgets.FloatSlider(value=0.05, min=0.01, max=0.20, step=0.01, description="kWh Price ($):", style={'description_width': 'initial'})
    aerator_tier = widgets.Text(value='Medium', description='Aerator Tier:', layout={'width': '400px'})
    horsepower_widget = widgets.FloatSlider(value=3, min=0.5, max=20, step=0.5, description="Horse Power:", style={'description_width': 'initial'})
    daily_hours = widgets.IntSlider(value=8, min=1, max=24, step=1, description='Daily Hours:', style={'description_width': 'initial'})
    run_button = widgets.Button(description="Run Analysis", button_style='success', tooltip='Click to run the analysis')
    add_aerator_button = widgets.Button(description="Add Another Aerator", button_style='info', tooltip='Click to add a new aerator')
    remove_selected_button = widgets.Button(description="Remove Selected", button_style='danger', tooltip='Click to remove selected aerators')
    output = widgets.Output()
    
    # Create aerator widgets with a single name field, other parameters, and a checkbox
    def create_aerator_widgets(aerator_data):
        widgets_dict = {}
        for i, aerator in enumerate(aerator_data):
            aerator_id = f"Aerator {i+1}"
            widgets_dict[aerator_id] = {
                "name": widgets.Text(
                    value=aerator["name"],
                    description="Name:",
                    style={'description_width': 'initial'}
                ),
                "t10": widgets.FloatSlider(
                    value=aerator["t10"],
                    min=0.1, max=5, step=0.1,
                    description="t₁₀ (min):",
                    style={'description_width': 'initial'}
                ),
                "t70": widgets.FloatSlider(
                    value=aerator["t70"],
                    min=1, max=20, step=0.1,
                    description="t₇₀ (min):",
                    style={'description_width': 'initial'}
                ),
                "capital_cost": widgets.FloatSlider(
                    value=aerator["capital_cost"],
                    min=100, max=5000, step=10,
                    description="Capital Cost ($):",
                    style={'description_width': 'initial'}
                ),
                "useful_life": widgets.FloatSlider(
                    value=aerator["useful_life"],
                    min=1, max=15, step=1,
                    description="Useful Life (yr):",
                    style={'description_width': 'initial'}
                ),
                "repair_cost": widgets.FloatSlider(
                    value=aerator["repair_cost"],
                    min=0, max=1200, step=5,
                    description="Repair Cost ($):",
                    style={'description_width': 'initial'}
                ),
                "operating_cost": widgets.FloatSlider(
                    value=aerator["operating_cost_per_hour"],
                    min=0, max=15, step=0.01,
                    description="Operating Cost ($/h):",
                    style={'description_width': 'initial'}
                ),
                "do_deficit_factor": widgets.FloatSlider(
                    value=1.1,
                    min=0.5, max=1.5, step=0.05,
                    description="DO Deficit Factor:",
                    style={'description_width': 'initial'}
                ),
                "water_depth_factor": widgets.FloatSlider(
                    value=1.0,
                    min=0.5, max=1.5, step=0.05,
                    description="Water Depth Factor:",
                    style={'description_width': 'initial'}
                ),
                "placement_factor": widgets.FloatSlider(
                    value=1.0,
                    min=0.5, max=1.5, step=0.05,
                    description="Placement Factor:",
                    style={'description_width': 'initial'}
                ),
                "remove_checkbox": widgets.Checkbox(
                    value=False,
                    description="Select to Remove",
                    indent=False
                )
            }
        return widgets_dict

    # Initialize aerator widgets
    aerator_widgets = create_aerator_widgets(initial_aerators)
    
    # Save path
    SAVE_PATH = "/home/luisvinatea/Dev/Repos/Aquaculture/reports/experiments"
    os.makedirs(SAVE_PATH, exist_ok=True)

    def plot_cost_and_price_curves(hp_range, total_costs, price_per_kg, selected_hp, optimal_cost, optimal_price):
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
        
        # Plot total cost vs HP
        ax1.plot(hp_range, total_costs, label="Total Cost (Chosen)", color='blue', linewidth=2)
        ax1.axvline(x=selected_hp, color='red', linestyle='--', label=f"Selected HP ({selected_hp} HP)", linewidth=1.5)
        ax1.axhline(y=optimal_cost, color='green', linestyle='--', label=f"Optimal Cost (${optimal_cost:.2f})", linewidth=1.5)
        ax1.set_xlabel("Horse Power (HP)", fontsize=12)
        ax1.set_ylabel("Total Annual Cost ($)", fontsize=12)
        ax1.set_title("Total Cost vs Aerator HP", fontsize=14, pad=15)
        ax1.set_yscale('log')
        ax1.legend(fontsize=10)
        ax1.grid(True, which="both", linestyle='--', alpha=0.7)
        
        # Plot price per kg of O₂ vs HP
        ax2.plot(hp_range, price_per_kg, label="Price per kg O₂", color='purple', linewidth=2)
        ax2.axvline(x=selected_hp, color='red', linestyle='--', label=f"Selected HP ({selected_hp} HP)", linewidth=1.5)
        ax2.axhline(y=optimal_price, color='green', linestyle='--', label=f"Optimal Price (${optimal_price:.2f}/kg O₂)", linewidth=1.5)
        ax2.set_xlabel("Horse Power (HP)", fontsize=12)
        ax2.set_ylabel("Price per kg of Transferred Oxygen ($/kg O₂)", fontsize=12)
        ax2.set_title("Price per kg O₂ vs Aerator HP", fontsize=14, pad=15)
        ax2.set_yscale('log')
        ax2.legend(fontsize=10)
        ax2.grid(True, which="both", linestyle='--', alpha=0.7)
        
        plt.tight_layout()
        plt.show()

    def plot_cost_curves_fixed_volume(hp_range, costs_subpowered, costs_chosen, costs_overpowered, selected_hp, aerator_names):
        plt.figure(figsize=(10, 6))
        for i, name in enumerate(aerator_names):
            plt.plot(hp_range, costs_subpowered[i], label=f"{name} (Subpowered)", linestyle='--', alpha=0.7)
            plt.plot(hp_range, costs_chosen[i], label=f"{name} (Chosen)", linestyle='-', linewidth=2)
            plt.plot(hp_range, costs_overpowered[i], label=f"{name} (Overpowered)", linestyle='-.', alpha=0.7)
        
        plt.axvline(x=selected_hp, color='red', linestyle='--', label=f"Selected HP ({selected_hp} HP)", linewidth=1.5)
        plt.xlabel("Horse Power (HP)", fontsize=12)
        plt.ylabel("Total Annual Cost ($)", fontsize=12)
        plt.title("Total Cost vs Aerator HP at Fixed Pond Volume (75 m³)", fontsize=14, pad=15)
        plt.yscale('log')
        plt.legend(fontsize=10, bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.grid(True, which="both", linestyle='--', alpha=0.7)
        plt.tight_layout()
        plt.show()

    def run_analysis(button):
        with output:
            clear_output(wait=True)
            
            if not aerator_widgets:
                print("Error: No aerators available to analyze. Please add at least one aerator.")
                return
            
            TEMPERATURE = temperature_widget.value
            SALINITY = salinity_widget.value
            KWH_PRICE = kwh_price_widget.value
            yearly_hours = daily_hours.value * 365
            global_hp = horsepower_widget.value  # Use the global horsepower parameter
            pond_volume = global_hp * 25  # Fixed pond volume based on chosen HP
            
            first_aerator_id = list(aerator_widgets.keys())[0]
            first_aerator_name = aerator_widgets[first_aerator_id]["name"].value.strip() or first_aerator_id
            initial_metrics = calculator.calculate_metrics(
                TEMPERATURE, SALINITY, global_hp, pond_volume, 
                aerator_widgets[first_aerator_id]["t10"].value, 
                aerator_widgets[first_aerator_id]["t70"].value, 
                KWH_PRICE, first_aerator_name,
                aerator_widgets[first_aerator_id]["do_deficit_factor"].value,
                aerator_widgets[first_aerator_id]["water_depth_factor"].value,
                aerator_widgets[first_aerator_id]["placement_factor"].value
            )
            initial_sotr = initial_metrics["SOTR (kg O₂/h)"]
            initial_total_o2_demand = initial_sotr * yearly_hours
            
            updated_aerators = []
            aerator_metrics = {}
            aerator_names = {}
            for aerator_id, widgets in aerator_widgets.items():
                aerator_name = widgets["name"].value.strip() or aerator_id
                aerator_names[aerator_id] = aerator_name
                hp = global_hp  # Use the global horsepower for all aerators
                t10 = widgets["t10"].value
                t70 = widgets["t70"].value
                do_deficit_factor = widgets["do_deficit_factor"].value
                water_depth_factor = widgets["water_depth_factor"].value
                placement_factor = widgets["placement_factor"].value
                
                metrics = calculator.calculate_metrics(
                    TEMPERATURE, SALINITY, hp, pond_volume, t10, t70, KWH_PRICE, aerator_name,
                    do_deficit_factor, water_depth_factor, placement_factor
                )
                metrics = {k: truncate_to_2_decimals(v) if isinstance(v, float) else v 
                          for k, v in metrics.items()}
                do_rate = metrics["SOTR (kg O₂/h)"]
                aerator_metrics[aerator_name] = metrics
                
                updated_aerators.append(Aerator(
                    name=aerator_name,
                    hp=hp,
                    capital_cost=widgets["capital_cost"].value,
                    useful_life=widgets["useful_life"].value,
                    repair_cost=widgets["repair_cost"].value,
                    operating_cost_per_hour=widgets["operating_cost"].value,
                    do_rate=do_rate
                ))
            
            # Breakeven analysis: Subpowered and Overpowered costs at fixed pond volume
            subpowered_costs = []
            overpowered_costs = []
            aerator_ids = [aerator.name for aerator in updated_aerators]
            
            # Cost curves for subpowered, chosen, and overpowered scenarios at fixed pond volume
            hp_range = np.linspace(0.5, 20, 50)
            costs_subpowered = []
            costs_chosen = []
            costs_overpowered = []
            
            for aerator in updated_aerators:
                aerator_name = aerator.name
                aerator_id = [key for key, value in aerator_names.items() if value == aerator_name][0]
                widgets = aerator_widgets[aerator_id]
                
                # Subpowered: Use half the global HP (or minimum HP) at fixed pond volume
                subpowered_costs_hp = []
                for hp in hp_range:
                    subpowered_hp = max(0.5, hp / 2)
                    subpowered_metrics = calculator.calculate_metrics(
                        TEMPERATURE, SALINITY, subpowered_hp, pond_volume,
                        widgets["t10"].value,
                        widgets["t70"].value,
                        KWH_PRICE, aerator_name,
                        widgets["do_deficit_factor"].value,
                        widgets["water_depth_factor"].value,
                        widgets["placement_factor"].value
                    )
                    subpowered_o2_per_hour = subpowered_metrics["SOTR (kg O₂/h)"]
                    subpowered_o2_demand = subpowered_o2_per_hour * yearly_hours
                    
                    subpowered_aerator = Aerator(
                        name=aerator_name,
                        hp=subpowered_hp,
                        capital_cost=widgets["capital_cost"].value * (subpowered_hp / global_hp),
                        useful_life=widgets["useful_life"].value,
                        repair_cost=widgets["repair_cost"].value * (subpowered_hp / global_hp),
                        operating_cost_per_hour=widgets["operating_cost"].value * (subpowered_hp / global_hp),
                        do_rate=subpowered_o2_per_hour
                    )
                    sub_optimizer = AerationOptimizer([subpowered_aerator], subpowered_o2_demand, yearly_hours)
                    sub_result = sub_optimizer.optimize()
                    sub_cost = sub_result['optimal_cost'] if 'optimal_cost' in sub_result else float('inf')
                    subpowered_costs_hp.append(sub_cost)
                costs_subpowered.append(subpowered_costs_hp)
                
                # Chosen: Use the HP as is at fixed pond volume
                chosen_costs_hp = []
                for hp in hp_range:
                    chosen_metrics = calculator.calculate_metrics(
                        TEMPERATURE, SALINITY, hp, pond_volume,
                        widgets["t10"].value,
                        widgets["t70"].value,
                        KWH_PRICE, aerator_name,
                        widgets["do_deficit_factor"].value,
                        widgets["water_depth_factor"].value,
                        widgets["placement_factor"].value
                    )
                    chosen_o2_per_hour = chosen_metrics["SOTR (kg O₂/h)"]
                    chosen_o2_demand = chosen_o2_per_hour * yearly_hours
                    
                    chosen_aerator = Aerator(
                        name=aerator_name,
                        hp=hp,
                        capital_cost=widgets["capital_cost"].value * (hp / global_hp),
                        useful_life=widgets["useful_life"].value,
                        repair_cost=widgets["repair_cost"].value * (hp / global_hp),
                        operating_cost_per_hour=widgets["operating_cost"].value * (hp / global_hp),
                        do_rate=chosen_o2_per_hour
                    )
                    chosen_optimizer = AerationOptimizer([chosen_aerator], chosen_o2_demand, yearly_hours)
                    chosen_result = chosen_optimizer.optimize()
                    chosen_cost = chosen_result['optimal_cost'] if 'optimal_cost' in chosen_result else float('inf')
                    chosen_costs_hp.append(chosen_cost)
                costs_chosen.append(chosen_costs_hp)
                
                # Overpowered: Use double the HP (or max HP) at fixed pond volume
                overpowered_costs_hp = []
                for hp in hp_range:
                    overpowered_hp = min(20, hp * 2)
                    overpowered_metrics = calculator.calculate_metrics(
                        TEMPERATURE, SALINITY, overpowered_hp, pond_volume,
                        widgets["t10"].value,
                        widgets["t70"].value,
                        KWH_PRICE, aerator_name,
                        widgets["do_deficit_factor"].value,
                        widgets["water_depth_factor"].value,
                        widgets["placement_factor"].value
                    )
                    overpowered_o2_per_hour = overpowered_metrics["SOTR (kg O₂/h)"]
                    overpowered_o2_demand = overpowered_o2_per_hour * yearly_hours
                    
                    overpowered_aerator = Aerator(
                        name=aerator_name,
                        hp=overpowered_hp,
                        capital_cost=widgets["capital_cost"].value * (overpowered_hp / global_hp),
                        useful_life=widgets["useful_life"].value,
                        repair_cost=widgets["repair_cost"].value * (overpowered_hp / global_hp),
                        operating_cost_per_hour=widgets["operating_cost"].value * (overpowered_hp / global_hp),
                        do_rate=overpowered_o2_per_hour
                    )
                    over_optimizer = AerationOptimizer([overpowered_aerator], overpowered_o2_demand, yearly_hours)
                    over_result = over_optimizer.optimize()
                    over_cost = over_result['optimal_cost'] if 'optimal_cost' in over_result else float('inf')
                    overpowered_costs_hp.append(over_cost)
                costs_overpowered.append(overpowered_costs_hp)
                
                # Calculate costs at specific HP values for breakeven analysis
                subpowered_hp = max(0.5, global_hp / 2)
                subpowered_metrics = calculator.calculate_metrics(
                    TEMPERATURE, SALINITY, subpowered_hp, pond_volume,
                    widgets["t10"].value,
                    widgets["t70"].value,
                    KWH_PRICE, aerator_name,
                    widgets["do_deficit_factor"].value,
                    widgets["water_depth_factor"].value,
                    widgets["placement_factor"].value
                )
                subpowered_o2_per_hour = subpowered_metrics["SOTR (kg O₂/h)"]
                subpowered_o2_demand = subpowered_o2_per_hour * yearly_hours
                
                subpowered_aerator = Aerator(
                    name=aerator_name,
                    hp=subpowered_hp,
                    capital_cost=widgets["capital_cost"].value * (subpowered_hp / global_hp),
                    useful_life=widgets["useful_life"].value,
                    repair_cost=widgets["repair_cost"].value * (subpowered_hp / global_hp),
                    operating_cost_per_hour=widgets["operating_cost"].value * (subpowered_hp / global_hp),
                    do_rate=subpowered_o2_per_hour
                )
                sub_optimizer = AerationOptimizer([subpowered_aerator], subpowered_o2_demand, yearly_hours)
                sub_result = sub_optimizer.optimize()
                subpowered_costs.append(sub_result['optimal_cost'] if 'optimal_cost' in sub_result else float('inf'))
                
                overpowered_hp = min(20, global_hp * 2)
                overpowered_metrics = calculator.calculate_metrics(
                    TEMPERATURE, SALINITY, overpowered_hp, pond_volume,
                    widgets["t10"].value,
                    widgets["t70"].value,
                    KWH_PRICE, aerator_name,
                    widgets["do_deficit_factor"].value,
                    widgets["water_depth_factor"].value,
                    widgets["placement_factor"].value
                )
                overpowered_o2_per_hour = overpowered_metrics["SOTR (kg O₂/h)"]
                overpowered_o2_demand = overpowered_o2_per_hour * yearly_hours
                
                overpowered_aerator = Aerator(
                    name=aerator_name,
                    hp=overpowered_hp,
                    capital_cost=widgets["capital_cost"].value * (overpowered_hp / global_hp),
                    useful_life=widgets["useful_life"].value,
                    repair_cost=widgets["repair_cost"].value * (overpowered_hp / global_hp),
                    operating_cost_per_hour=widgets["operating_cost"].value * (overpowered_hp / global_hp),
                    do_rate=overpowered_o2_per_hour
                )
                over_optimizer = AerationOptimizer([overpowered_aerator], overpowered_o2_demand, yearly_hours)
                over_result = over_optimizer.optimize()
                overpowered_costs.append(over_result['optimal_cost'] if 'optimal_cost' in over_result else float('inf'))
            
            # Continuous HP analysis for cost and price curves (pond volume scales with HP)
            hp_range = np.linspace(0.5, 20, 50)
            total_costs = []
            price_per_kg = []
            for hp in hp_range:
                pond_volume_hp = hp * 25
                metrics = calculator.calculate_metrics(
                    TEMPERATURE, SALINITY, hp, pond_volume_hp,
                    aerator_widgets[first_aerator_id]["t10"].value,
                    aerator_widgets[first_aerator_id]["t70"].value,
                    KWH_PRICE, first_aerator_name,
                    aerator_widgets[first_aerator_id]["do_deficit_factor"].value,
                    aerator_widgets[first_aerator_id]["water_depth_factor"].value,
                    aerator_widgets[first_aerator_id]["placement_factor"].value
                )
                do_rate = metrics["SOTR (kg O₂/h)"]
                o2_demand = do_rate * yearly_hours
                
                base_aerator = updated_aerators[0]
                aerator = Aerator(
                    name=first_aerator_name,
                    hp=hp,
                    capital_cost=base_aerator.capital_cost * (hp / global_hp),
                    useful_life=base_aerator.useful_life,
                    repair_cost=base_aerator.repair_cost * (hp / global_hp),
                    operating_cost_per_hour=base_aerator.operating_cost_per_hour * (hp / global_hp),
                    do_rate=do_rate
                )
                optimizer = AerationOptimizer([aerator], o2_demand, yearly_hours)
                result = optimizer.optimize()
                total_cost = result['optimal_cost'] if 'optimal_cost' in result else float('inf')
                total_costs.append(total_cost)
                price_per_kg.append(metrics["US$/kg O₂"])
            
            optimizer = AerationOptimizer(updated_aerators, initial_total_o2_demand, yearly_hours)
            result = optimizer.optimize()
            
            total_o2_demand = 0
            if "aerator_usage" in result:
                for aerator, usage in zip(updated_aerators, result["aerator_usage"].values()):
                    if usage > 0:
                        total_o2_demand += aerator.do_rate * yearly_hours * usage
            else:
                total_o2_demand = initial_total_o2_demand
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"integrated_do_{int(total_o2_demand)}_hours_{yearly_hours}_{timestamp}.txt"
            filepath = os.path.join(SAVE_PATH, filename)
            
            # Prepare tables for output
            # General Information Table
            general_info = [
                ["Aerator Tier", aerator_tier.value],
                ["Temperature (°C)", f"{TEMPERATURE:.1f}"],
                ["Salinity (‰)", f"{SALINITY:.1f}"],
                ["Horse Power (HP)", f"{global_hp:.2f}"],
                ["Calculated Pond Volume (m³)", f"{pond_volume:.2f}"],
                ["Daily Hours", daily_hours.value],
                ["Yearly Hours", yearly_hours],
                ["Total Oxygen Demand (kg O₂/year)", f"{total_o2_demand:.2f}"],
                ["kWh Price ($)", f"{KWH_PRICE:.2f}"]
            ]
            
            # Aerator-Specific Parameters Table
            aerator_params = []
            headers = ["Parameter", "Beraqua (New)", "Beraqua (Mid)", "Beraqua (Old)"]
            params = [
                "Horse Power (HP)", "t₁₀ (min)", "t₇₀ (min)", "DO Deficit Factor", "Water Depth Factor",
                "Placement Factor", "Calculated DO Rate (kg O₂/h)", "SAE (kg O₂/kWh)", "KlaT (h⁻¹)", "Power (kW)",
                "Capital Cost ($)", "Useful Life (yr)", "Repair Cost ($)", "Operating Cost ($/h)"
            ]
            for param in params:
                row = [param]
                for aerator in updated_aerators:
                    aerator_name = aerator.name
                    aerator_id = [key for key, value in aerator_names.items() if value == aerator_name][0]
                    widgets = aerator_widgets[aerator_id]
                    metrics = aerator_metrics[aerator_name]
                    if param == "Horse Power (HP)":
                        row.append(f"{aerator.hp:.2f}")
                    elif param == "t₁₀ (min)":
                        row.append(f"{widgets['t10'].value:.2f}")
                    elif param == "t₇₀ (min)":
                        row.append(f"{widgets['t70'].value:.2f}")
                    elif param == "DO Deficit Factor":
                        row.append(f"{widgets['do_deficit_factor'].value:.2f}")
                    elif param == "Water Depth Factor":
                        row.append(f"{widgets['water_depth_factor'].value:.2f}")
                    elif param == "Placement Factor":
                        row.append(f"{widgets['placement_factor'].value:.2f}")
                    elif param == "Calculated DO Rate (kg O₂/h)":
                        row.append(f"{aerator.do_rate:.2f}")
                    elif param == "SAE (kg O₂/kWh)":
                        row.append(f"{metrics['SAE (kg O₂/kWh)']:.2f}")
                    elif param == "KlaT (h⁻¹)":
                        row.append(f"{metrics['KlaT (h⁻¹)']:.2f}")
                    elif param == "Power (kW)":
                        row.append(f"{metrics['Power (kW)']:.2f}")
                    elif param == "Capital Cost ($)":
                        row.append(f"{widgets['capital_cost'].value:.2f}")
                    elif param == "Useful Life (yr)":
                        row.append(f"{widgets['useful_life'].value:.2f}")
                    elif param == "Repair Cost ($)":
                        row.append(f"{widgets['repair_cost'].value:.2f}")
                    elif param == "Operating Cost ($/h)":
                        row.append(f"{widgets['operating_cost'].value:.2f}")
                aerator_params.append(row)
            
            # Breakeven Analysis Table
            breakeven_analysis = []
            headers_breakeven = ["Aerator", f"Subpowered Cost (HP={max(0.5, global_hp / 2):.2f})", f"Chosen Cost (HP={global_hp:.2f})", f"Overpowered Cost (HP={min(20, global_hp * 2):.2f})"]
            for i, aerator_id in enumerate(aerator_ids):
                chosen_cost = updated_aerators[i].total_cost(yearly_hours)
                breakeven_analysis.append([
                    aerator_id,
                    f"${subpowered_costs[i]:.2f}",
                    f"${chosen_cost:.2f}",
                    f"${overpowered_costs[i]:.2f}"
                ])
            
            # Optimization Results Table
            optimization_results = []
            headers_optimization = ["Parameter", "Value"]
            if "optimal_cost" in result:
                optimization_results.append(["Optimal Total Cost ($)", f"{result['optimal_cost']:.2f}"])
                optimization_results.append(["Depreciation Cost ($)", f"{result['depreciation_cost']:.2f}"])
                for name, usage in result["aerator_usage"].items():
                    if usage > 0:
                        optimization_results.append([f"Usage: {name}", f"{usage:.2f} units"])
            else:
                optimization_results.append(["Status", result['status']])
                optimization_results.append(["Message", result['message']])
            
            # Print tables
            print("Integrated Analysis\n")
            print("General Information")
            print(tabulate(general_info, headers=["Parameter", "Value"], tablefmt="fancy_grid"))
            print("\nAerator-Specific Parameters")
            print(tabulate(aerator_params, headers=headers, tablefmt="fancy_grid"))
            print("\nBreakeven Analysis (Costs at Fixed Pond Volume)")
            print(tabulate(breakeven_analysis, headers=headers_breakeven, tablefmt="fancy_grid"))
            print("\nOptimization Results")
            print(tabulate(optimization_results, headers=headers_optimization, tablefmt="fancy_grid"))
            print(f"\nResults saved to: {filepath}")
            
            # Save to file
            with open(filepath, 'w') as f:
                f.write("Integrated Analysis\n\n")
                f.write("General Information\n")
                f.write(tabulate(general_info, headers=["Parameter", "Value"], tablefmt="fancy_grid"))
                f.write("\n\nAerator-Specific Parameters\n")
                f.write(tabulate(aerator_params, headers=headers, tablefmt="fancy_grid"))
                f.write("\n\nBreakeven Analysis (Costs at Fixed Pond Volume)\n")
                f.write(tabulate(breakeven_analysis, headers=headers_breakeven, tablefmt="fancy_grid"))
                f.write("\n\nOptimization Results\n")
                f.write(tabulate(optimization_results, headers=headers_optimization, tablefmt="fancy_grid"))
                f.write(f"\n\nResults saved to: {filepath}")
            
            # Plot the cost and price curves (pond volume scales with HP)
            plot_cost_and_price_curves(hp_range, total_costs, price_per_kg, global_hp, result['optimal_cost'], initial_metrics['US$/kg O₂'])
            
            # Plot the cost curves at fixed pond volume
            plot_cost_curves_fixed_volume(hp_range, costs_subpowered, costs_chosen, costs_overpowered, global_hp, aerator_ids)

    # Function to add a new aerator
    def add_aerator(button):
        new_aerator = {
            "name": "",
            "hp": 3,
            "capital_cost": 1200,
            "useful_life": 6,
            "repair_cost": 200,
            "operating_cost_per_hour": 0.45,
            "t10": 1,
            "t70": 8
        }
        initial_aerators.append(new_aerator)
        
        new_aerator_id = f"Aerator {len(initial_aerators)}"
        aerator_widgets[new_aerator_id] = create_aerator_widgets([new_aerator])[new_aerator_id]
        
        new_accordion_item = widgets.VBox(
            [widgets.Label(f"{new_aerator_id} Settings", layout={'font_weight': 'bold'}),
             *aerator_widgets[new_aerator_id].values()],
            layout={'padding': '5px'}
        )
        accordion.children = list(accordion.children) + [new_accordion_item]
        accordion.set_title(len(accordion.children) - 1, new_aerator_id)
        
        aerator_widgets[new_aerator_id]["name"].observe(
            lambda change, idx=len(accordion.children)-1: update_title(change, idx),
            names='value'
        )

    # Function to remove selected aerators
    def remove_selected(button):
        if len(aerator_widgets) <= 1:
            with output:
                clear_output(wait=True)
                print("Cannot remove the last aerator. At least one aerator must remain.")
            return
        
        to_remove = [aerator_id for aerator_id, widgets in aerator_widgets.items() if widgets["remove_checkbox"].value]
        
        if not to_remove:
            with output:
                clear_output(wait=True)
                print("No aerators selected for removal.")
            return
        
        new_initial_aerators = []
        new_aerator_widgets = {}
        for i, aerator in enumerate(initial_aerators):
            aerator_id = f"Aerator {i+1}"
            if aerator_id not in to_remove:
                new_initial_aerators.append(aerator)
                new_aerator_id = f"Aerator {len(new_initial_aerators)}"
                new_aerator_widgets[new_aerator_id] = aerator_widgets[aerator_id]
                new_aerator_widgets[new_aerator_id]["name"].unobserve_all()
        
        initial_aerators.clear()
        initial_aerators.extend(new_initial_aerators)
        aerator_widgets.clear()
        aerator_widgets.update(new_aerator_widgets)
        
        new_accordion_items = []
        for i, (aerator_id, widget_group) in enumerate(aerator_widgets.items()):
            new_accordion_items.append(widgets.VBox(
                [widgets.Label(f"{aerator_id} Settings", layout={'font_weight': 'bold'}),
                 *widget_group.values()],
                layout={'padding': '5px'}
            ))
            widget_group["name"].observe(
                lambda change, idx=i: update_title(change, idx),
                names='value'
            )
        
        accordion.children = new_accordion_items
        for i, aerator_id in enumerate(aerator_widgets.keys()):
            title = aerator_widgets[aerator_id]["name"].value.strip() or aerator_id
            accordion.set_title(i, title)

    # Function to update accordion title when name changes
    def update_title(change, index):
        new_title = change['new'].strip() or f"Aerator {index+1}"
        accordion.set_title(index, new_title)

    # Connect buttons to functions
    run_button.on_click(run_analysis)
    add_aerator_button.on_click(add_aerator)
    remove_selected_button.on_click(remove_selected)

    # Layout with Accordion for aerator settings
    global_controls = widgets.VBox(
        [widgets.Label("Global Settings", layout={'font_weight': 'bold'}),
         aerator_tier,
         horsepower_widget,
         daily_hours,
         temperature_widget,
         salinity_widget,
         kwh_price_widget,
         widgets.HBox([run_button, add_aerator_button, remove_selected_button])],
        layout={'padding': '10px'}
    )

    # Create an Accordion for aerator settings
    accordion_items = []
    for aerator_id, widget_group in aerator_widgets.items():
        accordion_items.append(widgets.VBox(
            [widgets.Label(f"{aerator_id} Settings", layout={'font_weight': 'bold'}),
             *widget_group.values()],
            layout={'padding': '5px'}
        ))

    accordion = widgets.Accordion(children=accordion_items, layout={'width': '600px'})
    for i, aerator_id in enumerate(aerator_widgets.keys()):
        accordion.set_title(i, aerator_id)
        aerator_widgets[aerator_id]["name"].observe(
            lambda change, idx=i: update_title(change, idx),
            names='value'
        )

    # Main layout
    ui = widgets.VBox(
        [widgets.Label("Integrated Aeration Financial Model", layout={'font_weight': 'bold', 'font_size': '16px', 'padding': '0px'}),
         widgets.HBox([global_controls, accordion], layout={'padding': '10px'})],
        layout={'border': '1px solid gray', 'padding': '10px'}
    )

    # Display interface
    display(ui, output)

if __name__ == "__main__":
    create_integrated_interface()