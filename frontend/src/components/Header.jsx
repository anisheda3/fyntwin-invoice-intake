import { motion } from "framer-motion"
import { History, Zap, Activity } from "lucide-react"

export default function Header({ health, onHistoryClick, sessionCount }) {
  const isHealthy = health?.status === "healthy"
  const isDegraded = health?.status === "degraded"

  return (
    <header style={styles.header}>
      {/* Logo + wordmark */}
      <div style={styles.brand}>
        <div style={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect
              x="0.5" y="0.5" width="27" height="27" rx="7.5"
              fill="url(#logoGrad)" fillOpacity="0.15"
              stroke="url(#logoGrad)" strokeWidth="0.5"
            />
            <path
              d="M8 14h4l2-5 2 10 2-5 2 0"
              stroke="url(#logoGrad)" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4f8ef7"/>
                <stop offset="1" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div style={styles.wordmark}>
            <span style={styles.wordmarkBold}>Fyn</span>
            <span style={styles.wordmarkLight}>twin</span>
          </div>
          <div style={styles.tagline}>Invoice Intelligence · Accounts Payable</div>
        </div>
      </div>

      {/* Center — AI indicator */}
      <div style={styles.center}>
        <motion.div
          style={styles.aiPill}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Zap size={11} color="#a855f7" />
          <span>Gemini 2.0 Flash · 3-Agent Team</span>
        </motion.div>
      </div>

      {/* Right — controls */}
      <div style={styles.controls}>
        {/* Health indicator */}
        <div style={styles.healthPill}>
          <motion.div
            style={{
              ...styles.healthDot,
              background: isHealthy ? "#22c55e" : isDegraded ? "#f59e0b" : "#ef4444",
              boxShadow: `0 0 8px ${isHealthy ? "#22c55e" : isDegraded ? "#f59e0b" : "#ef4444"}`,
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={styles.healthText}>
            ERPNext {isHealthy ? "Live" : isDegraded ? "Degraded" : "Offline"}
          </span>
        </div>

        {/* Activity / History button */}
        <button style={styles.iconBtn} onClick={onHistoryClick}>
          <Activity size={15} />
          {sessionCount > 0 && (
            <span style={styles.badge}>{sessionCount}</span>
          )}
        </button>
      </div>

      <style>{headerCSS}</style>
    </header>
  )
}

const styles = {
  header: {
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(8,12,20,0.8)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoMark: {
    flexShrink: 0,
  },
  wordmark: {
    fontSize: "16px",
    lineHeight: "1",
    letterSpacing: "-0.02em",
  },
  wordmarkBold: {
    fontWeight: 800,
    color: "#e2e8f0",
  },
  wordmarkLight: {
    fontWeight: 300,
    color: "#64748b",
  },
  tagline: {
    fontSize: "10px",
    color: "#475569",
    marginTop: "2px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  center: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  aiPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(168,85,247,0.08)",
    border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "11px",
    color: "#a855f7",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  healthPill: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "5px 12px",
  },
  healthDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  healthText: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: 500,
  },
  iconBtn: {
    position: "relative",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.2s",
  },
  badge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "#4f8ef7",
    color: "white",
    fontSize: "9px",
    fontWeight: 700,
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}

const headerCSS = `
  button[style*="iconBtn"]:hover,
  button:hover {
    border-color: rgba(255,255,255,0.15) !important;
    color: #e2e8f0 !important;
    background: rgba(255,255,255,0.06) !important;
  }
`