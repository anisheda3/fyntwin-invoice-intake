export default function DiscrepancyReport({ report }) {
  if (!report) return null

  const { mismatch_types, comparisons, summary } = report

  const labels = {
    supplier_mismatch: "🏢 Supplier Mismatch",
    item_mismatch: "📦 Item Mismatch",
    quantity_mismatch: "🔢 Quantity Mismatch",
    rate_mismatch: "💰 Rate Mismatch",
    total_mismatch: "🧾 Total Mismatch",
  }

  return (
    <div className="discrepancy-panel">
      <div className="discrepancy-header">
        <span>❌</span>
        <h2>Discrepancy Report</h2>
      </div>

      <div className="mismatch-tags">
        {mismatch_types?.map((t) => (
          <span key={t} className="mismatch-tag">{labels[t] || t}</span>
        ))}
      </div>

      <p className="discrepancy-summary">{summary}</p>

      {comparisons?.length > 0 && (
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Field</th><th>PO Value</th>
              <th>Invoice Value</th><th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c, i) => (
              <tr key={i} className={c.match ? "" : "row-mismatch"}>
                <td><strong>{c.field}</strong></td>
                <td>{String(c.po_value)}</td>
                <td>{String(c.invoice_value)}</td>
                <td className="diff-cell">
                  {c.difference || (c.match ? "—" : "Mismatch")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="no-invoice-notice">
        🔒 No Purchase Invoice created. The PO remains open.
      </div>
    </div>
  )
}