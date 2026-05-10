import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

const STATUS_CONFIG = {
  completed: { icon: CheckCircle, color: "#22c55e", label: "Completed" },
  cancelled: { icon: XCircle, color: "#64748b", label: "Cancelled" },
  error: { icon: AlertCircle, color: "#ef4444", label: "Error" },
  awaiting_confirmation: { icon: Clock, color: "#f59e0b", label: "Pending" },
  unknown: { icon: Clock, color: "#475569", label: "Unknown" },
}

export default function SessionDrawer({ open, onClose, sessions }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            style={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            style={styles.drawer}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Drawer header */}
            <div style={styles.drawerHeader}>
              <div>
                <h3 style={styles.drawerTitle}>Session History</h3>
                <p style={styles.drawerSub}>{sessions.length} total sessions</p>
              </div>
              <button style={styles.closeBtn} onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            {/* Sessions list */}
            <div style={styles.sessionList}>
              {sessions.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>📋</div>
                  <p style={styles.emptyText}>No sessions yet</p>
                  <p style={styles.emptySubtext}>
                    Process an invoice to see sessions here
                  </p>
                </div>
              ) : (
                [...sessions].reverse().map((s, i) => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.unknown
                  const Icon = cfg.icon
                  return (
                    <motion.div
                      key={s.session_id}
                      style={styles.sessionCard}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div style={{
                        ...styles.sessionCardLeft,
                        borderLeftColor: cfg.color,
                      }}>
                        <div style={styles.sessionTop}>
                          <Icon size={13} color={cfg.color} />
                          <span style={{ ...styles.sessionStatus, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <span style={styles.sessionTime}>
                            {new Date(s.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p style={styles.sessionPrompt}>
                          {s.prompt
                            ? s.prompt.substring(0, 90) + (s.prompt.length > 90 ? "..." : "")
                            : "No prompt recorded"}
                        </p>
                        <p style={styles.sessionId}>
                          {s.session_id.substring(0, 16)}...
                        </p>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "380px",
    background: "#0d1117",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    zIndex: 201,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  drawerTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  drawerSub: {
    fontSize: "12px",
    color: "#475569",
    marginTop: "3px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.2s",
  },
  sessionList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: "40px",
    opacity: 0.3,
  },
  emptyText: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#475569",
  },
  emptySubtext: {
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.5",
  },
  sessionCard: {
    borderRadius: "10px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "border-color 0.2s",
  },
  sessionCardLeft: {
    padding: "14px 16px",
    borderLeft: "3px solid transparent",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sessionTop: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sessionStatus: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    flex: 1,
  },
  sessionTime: {
    fontSize: "11px",
    color: "#334155",
    fontFamily: "'JetBrains Mono', monospace",
  },
  sessionPrompt: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.5",
  },
  sessionId: {
    fontSize: "10px",
    color: "#334155",
    fontFamily: "'JetBrains Mono', monospace",
  },
}