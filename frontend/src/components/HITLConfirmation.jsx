import { motion } from "framer-motion"
import { ShieldCheck, AlertTriangle } from "lucide-react"

const fmtINR = (val) => {
  const num = parseFloat(val)
  if (isNaN(num)) return String(val ?? "—")
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num)
}

const isNumericField = (field = "") => {
  const f = field.toLowerCase()
  return (
    f.includes("rate") ||
    f.includes("amount") ||
    f.includes("total") ||
    f.includes("price") ||
    f.includes("value")
  )
}

export default function HITLConfirmation({ payload, onConfirm, onCancel }) {
  const {
    po_reference,
    supplier_po,
    supplier_invoice,
    items_comparison = [],
    total_po,
    total_invoice,
    match_verdict,
    confirmation_prompt,
  } = payload

  const allMatch = items_comparison.every((c) => c.match)

  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <ShieldCheck size={20} color="#22c55e" />
          </div>
          <div>
            <h2 style={styles.title}>Invoice Verification</h2>
            <p style={styles.subtitle}>
              Review before creating Purchase Invoice
            </p>
          </div>
        </div>
        <div
          style={{
            ...styles.verdictBadge,
            background: allMatch
              ? "rgba(34,197,94,0.1)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${
              allMatch
                ? "rgba(34,197,94,0.25)"
                : "rgba(239,68,68,0.25)"
            }`,
            color: allMatch ? "#22c55e" : "#ef4444",
          }}
        >
          {match_verdict}
        </div>
      </div>

      {/* ── PO Reference strip ─────────────────────────────── */}
      <div style={styles.poStrip}>
        <span style={styles.poStripLabel}>Purchase Order</span>
        <span style={styles.poRef}>{po_reference}</span>
        <div style={styles.poStripRight}>
          <span style={styles.poStripLabel}>PO Total</span>
          <span style={styles.poTotal}>{fmtINR(total_po)}</span>
        </div>
      </div>

      {/* ── Comparison table ───────────────────────────────── */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Field</th>
              <th style={styles.th}>Purchase Order</th>
              <th style={styles.th}>Invoice Received</th>
              <th style={{ ...styles.th, textAlign: "center" }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {/*
              Render ONLY from items_comparison — no hardcoded rows.
              The backend already includes Supplier, Item, Qty, Rate, etc.
            */}
            {items_comparison.map((c, i) => (
              <CompareRow
                key={`${c.field}-${i}`}
                field={c.field}
                poVal={
                  isNumericField(c.field)
                    ? fmtINR(c.po_value)
                    : String(c.po_value ?? "—")
                }
                invVal={
                  isNumericField(c.field)
                    ? fmtINR(c.invoice_value)
                    : String(c.invoice_value ?? "—")
                }
                match={c.match}
                difference={c.difference}
                delay={i * 0.05}
              />
            ))}

            {/* Grand Total row — always appended separately */}
            <CompareRow
              field="Grand Total"
              poVal={fmtINR(total_po)}
              invVal={fmtINR(total_invoice)}
              match={
                typeof total_po === "number" &&
                typeof total_invoice === "number"
                  ? Math.abs(total_po - total_invoice) < 1
                  : total_po === total_invoice
              }
              isBold
              delay={items_comparison.length * 0.05}
            />
          </tbody>
        </table>
      </div>

      {/* ── Confirmation prompt ────────────────────────────── */}
      <div style={styles.promptBox}>
        <AlertTriangle size={14} color="#f59e0b" />
        <span style={styles.promptText}>{confirmation_prompt}</span>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div style={styles.actions}>
        <motion.button
          style={styles.cancelBtn}
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancel
        </motion.button>
        <motion.button
          style={styles.confirmBtn}
          onClick={onConfirm}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 8px 30px rgba(34,197,94,0.35)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          <ShieldCheck size={15} />
          Create Purchase Invoice
        </motion.button>
      </div>
    </div>
  )
}

/* ── CompareRow ───────────────────────────────────────────────────────────── */

function CompareRow({
  field,
  poVal,
  invVal,
  match,
  difference,
  isBold,
  delay = 0,
}) {
  return (
    <motion.tr
      style={{
        background:
          match === false ? "rgba(239,68,68,0.04)" : "transparent",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {/* Field name */}
      <td style={{ ...cellStyle, color: "#64748b", width: "22%" }}>
        {field}
      </td>

      {/* PO value */}
      <td
        style={{
          ...cellStyle,
          fontWeight: isBold ? 700 : 400,
          color: "#e2e8f0",
          fontFamily: isBold ? "'JetBrains Mono', monospace" : "inherit",
        }}
      >
        {poVal}
      </td>

      {/* Invoice value */}
      <td
        style={{
          ...cellStyle,
          fontWeight: isBold ? 700 : 400,
          color: match === false ? "#fca5a5" : "#e2e8f0",
          fontFamily: isBold ? "'JetBrains Mono', monospace" : "inherit",
        }}
      >
        {invVal}
        {match === false && difference && (
          <span style={styles.diffChip}>{difference}</span>
        )}
      </td>

      {/* Status icon */}
      <td style={{ ...cellStyle, textAlign: "center" }}>
        {match === true && (
          <span style={matchBadge} title="Matches PO">
            ✅ Match
          </span>
        )}
        {match === false && (
          <span style={mismatchBadge} title="Does not match PO">
            ❌ Diff
          </span>
        )}
        {match == null && (
          <span style={{ color: "#475569" }}>—</span>
        )}
      </td>
    </motion.tr>
  )
}

/* ── Styles ───────────────────────────────────────────────────────────────── */

const cellStyle = {
  padding: "11px 14px",
  fontSize: "13px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
}

const matchBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "rgba(34,197,94,0.12)",
  color: "#22c55e",
  border: "1px solid rgba(34,197,94,0.2)",
  borderRadius: "6px",
  padding: "2px 8px",
  fontSize: "11px",
  fontWeight: 600,
}

const mismatchBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "rgba(239,68,68,0.12)",
  color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: "6px",
  padding: "2px 8px",
  fontSize: "11px",
  fontWeight: 600,
}

const styles = {
  container: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(34,197,94,0.04)",
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
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.2)",
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
  verdictBadge: {
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  poStrip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 24px",
    background: "rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  poStripLabel: {
    fontSize: "10px",
    color: "#475569",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  poRef: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px",
    color: "#4f8ef7",
    background: "rgba(79,142,247,0.1)",
    padding: "2px 10px",
    borderRadius: "6px",
    flex: 1,
  },
  poStripRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  poTotal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "14px",
    fontWeight: 600,
    color: "#e2e8f0",
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
  diffChip: {
    marginLeft: "8px",
    fontSize: "10px",
    color: "#ef4444",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    padding: "1px 6px",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "nowrap",
  },
  promptBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    margin: "16px 24px",
    padding: "14px 16px",
    background: "rgba(245,158,11,0.06)",
    border: "1px solid rgba(245,158,11,0.15)",
    borderRadius: "10px",
  },
  promptText: {
    fontSize: "13px",
    color: "#d97706",
    lineHeight: "1.5",
  },
  actions: {
    display: "flex",
    gap: "12px",
    padding: "0 24px 24px",
  },
  cancelBtn: {
    flex: "0 0 auto",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
  confirmBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 700,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 20px rgba(34,197,94,0.25)",
    transition: "all 0.2s",
  },
}