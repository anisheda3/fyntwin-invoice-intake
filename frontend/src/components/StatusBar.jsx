import { motion } from "framer-motion"

const STAGE_INFO = {
  idle: { label: "Ready", color: "#475569" },
  processing: { label: "Processing", color: "#4f8ef7" },
  hitl: { label: "Awaiting Confirmation", color: "#f59e0b" },
  mismatch: { label: "Discrepancy Found", color: "#ef4444" },
  success: { label: "Invoice Created", color: "#22c55e" },
  cancelled: { label: "Cancelled", color: "#64748b" },
  error: { label: "Error", color: "#ef4444" },
}

export default function StatusBar({ health, stage, sessionId }) {
  const info = STAGE_INFO[stage] || STAGE_INFO.idle

  return (
    <div style={styles.bar}>
      {/* Left */}
      <div style={styles.left}>
        <motion.div
          style={{ ...styles.stageDot, background: info.color, boxShadow: `0 0 6px ${info.color}` }}
          animate={stage === "processing" ? { scale: [1, 1.4, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span style={{ ...styles.stageLabel, color: info.color }}>{info.label}</span>
      </div>

      {/* Center */}
      <div style={styles.center}>
        {sessionId && (
          <span style={styles.sessionId}>
            Session: <span style={styles.sessionIdVal}>{sessionId.substring(0, 8)}...</span>
          </span>
        )}
      </div>

      {/* Right */}
      <div style={styles.right}>
        <span style={styles.meta}>Agno · Coordinate Mode · 3 Agents</span>
        <span style={styles.divider}>|</span>
        <span style={styles.meta}>
          RAG · MCP · HITL
        </span>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(8,12,20,0.9)",
    fontSize: "11px",
    position: "sticky",
    bottom: 0,
    zIndex: 100,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flex: 1,
  },
  stageDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  stageLabel: {
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
  },
  sessionId: {
    color: "#334155",
    fontFamily: "'JetBrains Mono', monospace",
  },
  sessionIdVal: {
    color: "#475569",
  },
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
  },
  meta: {
    color: "#334155",
    letterSpacing: "0.03em",
  },
  divider: {
    color: "#1e293b",
  },
}