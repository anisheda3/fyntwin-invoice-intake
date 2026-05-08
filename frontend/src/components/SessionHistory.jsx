export default function SessionHistory({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="history-panel">
        <h3>📋 Session History</h3>
        <p className="empty-state">No sessions yet. Process an invoice to begin.</p>
      </div>
    )
  }

  const emoji = {
    completed: "✅", cancelled: "🚫",
    error: "❌", awaiting_confirmation: "⏸️",
  }

  return (
    <div className="history-panel">
      <h3>📋 Session History ({sessions.length})</h3>
      <div className="history-list">
        {[...sessions].reverse().map((s) => (
          <div key={s.session_id} className={`history-item status-${s.status}`}>
            <div className="history-item-header">
              <span className="history-status">
                {emoji[s.status] || "●"} {s.status}
              </span>
              <span className="history-time">
                {new Date(s.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p className="history-prompt">
              {s.prompt ? s.prompt.substring(0, 80) + "..." : "No prompt recorded"}
            </p>
            {s.result_summary && (
              <p className="history-summary">{s.result_summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}