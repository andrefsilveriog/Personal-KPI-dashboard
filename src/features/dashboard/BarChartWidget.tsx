import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetData } from "./dashboardEngine";

type BarChartWidgetProps = {
  data: WidgetData;
};

export function BarChartWidget({ data }: BarChartWidgetProps) {
  if (data.barRows.length === 0) {
    return <p className="status-message">No chart data.</p>;
  }

  return (
    <div className="bar-widget">
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data.barRows}>
          <XAxis dataKey="name" tick={{ fill: "#adc0cc", fontSize: 11 }} />
          <YAxis tick={{ fill: "#adc0cc", fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#7dd3a8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
