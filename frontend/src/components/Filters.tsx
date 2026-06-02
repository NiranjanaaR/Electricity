import Segmented from "./Segmented";

interface Props {
  action: string;
  setAction: (v: string) => void;
  risk: string;
  setRisk: (v: string) => void;
}

const ACTION_OPTIONS = [
  { label: "All", value: "" },
  { label: "Buy", value: "BUY" },
  { label: "Watch", value: "WATCH" },
  { label: "Avoid", value: "AVOID" },
];

const RISK_OPTIONS = [
  { label: "All", value: "" },
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
];

export default function Filters({ action, setAction, risk, setRisk }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Segmented label="Action" options={ACTION_OPTIONS} value={action} onChange={setAction} />
      <Segmented label="Risk" options={RISK_OPTIONS} value={risk} onChange={setRisk} />
    </div>
  );
}
