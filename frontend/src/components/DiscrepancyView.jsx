import { motion } from "framer-motion"
import { XCircle, AlertTriangle, RotateCcw } from "lucide-react"

const TYPE_CONFIG = {
  supplier_mismatch: { label: "Supplier", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  item_mismatch: { label: "Item", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  quantity_mismatch: { label: "Quantity", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  rate_mismatch: { label: "Rate", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  total_mismatch: { label: "Total", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
}

export default function DiscrepancyView({ report, onReset }) {
  const { mismatch_types = [], comparisons = [], summary } = report

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <XCircle size={20} color="#ef4444" />
          </div>
          <div>
            <h2 style={styles.title}>Discrepancy Detected</h2>
            <p style={styles.subtitle}>Invoice does not match the Purchase Order</p>
          </div>
        </div>
        <div style={styles.noCreateBadge}>
          🔒 Invoice not created
        </div>
      </div>

      {/* Mismatch type tags */}
      <div style={styles.tagsRow}>
        {mismatch_types.map((type) => {
          const cfg = TYPE_CONFIG[type] || { label: type, color: "#64748b", bg: "rgba(100,116,139,0.1)" }
          return (
            <motion.span
              key={type}
              style={{
                ...styles.tag,
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.color}30`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AlertTriangle size={11} />
              {cfg.label} Mismatch
            </motion.span>
          )
        })}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <p style={styles.summaryText}>{summary}</p>
      </div>

      {/* Comparison table */}
      {comparisons.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Field</th>
                <th style={styles.th}>PO Value</th>
                <th style={styles.th}>Invoice Value</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Delta</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c, i) => (
                <motion.tr
                  key={i}
                  style={{
                    background: !c.match ? "rgba(239,68,68,0.04)" : "transparent",
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <td style={{ ...cellStyle, color: "#64748b" }}>{c.field}</td>
                  <td style={{ ...cellStyle, color: "#e2e8f0" }}>
                    {String(c.po_value ?? "—")}
                  </td>
                  <td style={{
                    ...cellStyle,
                    color: !c.match ? "#fca5a5" : "#e2e8f0",
                    fontWeight: !c.match ? 600 : 400,
                  }}>
                    {String(c.invoice_value ?? "—")}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {!c.match ? (
                      <span style={diffBadge}>{c.difference || "Mismatch"}</span>
                    ) : (
                      <span style={okBadge}>✓</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer actions */}
      <div style={styles.footer}>
        <p style={styles.footerNote}>
          The Purchase Order remains open. Contact the supplier to resolve discrepancies.
        </p>
        <button style={styles.resetBtn} onClick={onReset}>
          <RotateCcw size={14} />
          Process Another Invoice
        </button>
      </div>
    </div>
  )
}

const cellStyle = {
  padding: "11px 14px",
  fontSize: "13px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
}

const diffBadge = {
  display: "inline-block",
  background: "rgba(239,68,68,0.12)",
  color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: "6px",
  padding: "2px 8px",
  fontSize: "11px",
  fontWeight: 600,
  fontFamily: "'JetBrains Mono', monospace",
}

const okBadge = {
  display: "inline-block",
  color: "#22c55e",
  fontSize: "14px",
}

const styles = {
  container: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "16px",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(239,68,68,0.04)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  headerIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  noCreateBadge: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "12px",
    color: "#ef4444",
    fontWeight: 600,
  },
  tagsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  summary: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  summaryText: {
    fontSize: "13px",
    color: "#94a3b8",
    lineHeight: "1.6",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 14px",
    fontSize: "10px",
    fontWeight: 600,
    color: "#475569",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    background: "rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    gap: "16px",
    flexWrap: "wrap",
  },
  footerNote: {
    fontSize: "12px",
    color: "#475569",
    flex: 1,
    lineHeight: "1.5",
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#94a3b8",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
}