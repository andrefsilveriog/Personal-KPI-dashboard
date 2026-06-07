import type { WidgetData } from "./dashboardEngine";

type TableWidgetProps = {
  data: WidgetData;
};

export function TableWidget({ data }: TableWidgetProps) {
  const headers = data.tableRows[0] ? Object.keys(data.tableRows[0]) : [];

  if (data.tableRows.length === 0) {
    return <p className="status-message">No rows.</p>;
  }

  return (
    <div className="widget-table-wrap">
      <table className="widget-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.tableRows.map((row, index) => (
            <tr key={index}>
              {headers.map((header) => (
                <td key={header}>{row[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
