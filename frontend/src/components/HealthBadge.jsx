export default function HealthBadge({ health }) {
  if (!health) {
    return <span className="health-badge unknown">● Connecting...</span>
  }

  const color =
    health.status === "healthy"
      ? "healthy"
      : health.status === "degraded"
      ? "degraded"
      : "unhealthy"

  return (
    <div className="health-badge-container">
      <span className={`health-badge ${color}`}>
        ● {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
      </span>
      <span className="erp-status">
        ERPNext: {health.erpnext_reachable ? "✅ Connected" : "❌ Unreachable"}
      </span>
    </div>
  )
}