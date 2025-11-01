export default function StatCard({
  title,
  value,
  unit,
  subtitle,
  status = "ok", // "ok" | "warn" | "danger"
}) {
  return (
    <div className={`card stat ${status}`}>
      <div className="stat-header">
        <h3>{title}</h3>
        {status !== "ok" && <span className={`badge ${status}`}>{status.toUpperCase()}</span>}
      </div>
      <div className="stat-value">
        <span>{value}</span>
        {unit && <small className="unit">{unit}</small>}
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
