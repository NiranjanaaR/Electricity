import type { Appliance } from "../types";

export const APPLIANCES: Appliance[] = [
  {
    id: "dishwasher",
    name: "Dishwasher",
    icon: "🍽️",
    kWh: 1.2,
    runHours: 2,
    description: "Standard eco programme (~2 h)",
  },
  {
    id: "washing-machine",
    name: "Washing Machine",
    icon: "🧺",
    kWh: 0.9,
    runHours: 2,
    description: "40 °C cotton cycle (~2 h)",
  },
  {
    id: "dryer",
    name: "Tumble Dryer",
    icon: "🌀",
    kWh: 2.5,
    runHours: 2,
    description: "Heat-pump dryer (~2 h)",
  },
];
