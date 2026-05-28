export interface PriceEntry {
  NOK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: string;
  time_end: string;
}

export interface HourPoint {
  index: number;
  hour: number;
  label: string;
  price: number;
  start: Date;
  end: Date;
}

export interface Appliance {
  id: string;
  name: string;
  icon: string;
  kWh: number;
  runHours: number;
  description: string;
}

export interface RunWindow {
  startIndex: number;
  endIndex: number;
  startHour: number;
  endHour: number;
  avgPrice: number;
  totalCost: number;
}

export type PriceArea = "NO1" | "NO2" | "NO3" | "NO4" | "NO5";
