import { motion } from "framer-motion"
import { CheckCircle, ExternalLink, RotateCcw, FileText } from "lucide-react"

export default function SuccessView({ document, onReset }) {
  return (
    <div style={styles.container}>
      {/* Animated success ring */}
      <div style={styles.visual}>
        <motion.div
          style={styles.ring3}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
        <motion.div
          style={styles.ring2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <motion.div
          style={styles.ring1}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />
        <motion.div
          style={styles.iconCircle}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <CheckCircle size={32} color="#22c55e" />
        </motion.div>
      </div>

      <motion.div
        style={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h2 style={styles.title}>Purchase Invoice Created</h2>
        <p style={styles.subtitle}>
          The invoice has been successfully recorded in ERPNext and linked to the Purchase Order.
        </p>

        {document && (
          <div style={styles.docCard}>
            <div style={styles.docCardLeft}>
              <FileText size={16} color="#4f8ef7" />
              <div>
                <div style={styles.docLabel}>Document Reference</div>
                <div style={styles.docName}>{document}</div>
              </div>
            </div>
            <div style={styles.docStatus}>
              <span style={styles.docStatusDot} />
              Saved
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button style={styles.newBtn} onClick={onReset}>
            <RotateCcw size={14} />
            Process Another Invoice
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "500px",
    gap: "36px",
    padding: "40px",
  },
  visual: {
    position: "relative",
    width: "120px",
    height: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ring3: {
    position: "absolute",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "rgba(34,197,94,0.05)",
    border: "1px solid rgba(34,197,94,0.1)",
  },
  ring2: {
    position: "absolute",
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.15)",
  },
  ring1: {
    position: "absolute",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.25)",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    textAlign: "center",
    maxWidth: "420px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 800,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.6",
  },
  docCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "rgba(79,142,247,0.06)",
    border: "1px solid rgba(79,142,247,0.15)",
    borderRadius: "12px",
    padding: "16px 20px",
    gap: "12px",
  },
  docCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  docLabel: {
    fontSize: "10px",
    color: "#475569",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  docName: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "15px",
    fontWeight: 600,
    color: "#4f8ef7",
    marginTop: "3px",
  },
  docStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#22c55e",
    fontWeight: 600,
  },
  docStatusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 8px #22c55e",
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  newBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "11px 22px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#94a3b8",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
}