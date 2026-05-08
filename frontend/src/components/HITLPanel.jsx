export default function HITLPanel({ payload, onConfirm, onCancel, isLoading }) {
  if (!payload) return null

  const {
    po_reference, supplier_po, supplier_invoice,
    items_comparison, total_po, total_invoice,
    match_verdict, confirmation_prompt,
  } = payload

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 2,
    }).format(n)

  const suppMatch =
    supplier_po && supplier_invoice &&
    (supplier_po.toLowerCase().includes(supplier_invoice.toLowerCase()) ||
     supplier_invoice.toLowerCase().includes(supplier_po.toLowerCase()))

  return (
    <div className="hitl-panel">
      <div className="hitl-header">
        <span>⚠️</span>
        <h2>Human Review Required</h2>
        <span className={`verdict-badge ${match_verdict === "Full Match" ? "match" : "mismatch"}`}>
          {match_verdict}
        </span>
      </div>

      <p className="hitl-prompt">{confirmation_prompt}</p>

      <div className="info-row">
        <strong>PO Reference:</strong>
        <span className="po-ref">{po_reference}</span>
      </div>

      <table className="comparison-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Purchase Order</th>
            <th>Invoice Received</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Supplier</strong></td>
            <td>{supplier_po}</td>
            <td>{supplier_invoice}</td>
            <td>
              <span className={`match-icon ${suppMatch ? "ok" : "fail"}`}>
                {suppMatch ? "✅" : "❌"}
              </span>
            </td>
          </tr>
          {items_comparison?.map((item, i) => (
            <tr key={i} className={item.match ? "" : "row-mismatch"}>
              <td>{item.field}</td>
              <td>{String(item.po_value)}</td>
              <td>{String(item.invoice_value)}</td>
              <td>
                <span className={`match-icon ${item.match ? "ok" : "fail"}`}>
                  {item.match ? "✅" : "❌"}
                </span>
                {!item.match && item.difference && (
                  <span className="diff-label"> ({item.difference})</span>
                )}
              </td>
            </tr>
          ))}
          <tr className={Math.abs(total_po - total_invoice) < 1 ? "" : "row-mismatch"}>
            <td><strong>Grand Total</strong></td>
            <td>{fmt(total_po)}</td>
            <td>{fmt(total_invoice)}</td>
            <td>
              <span className={`match-icon ${Math.abs(total_po - total_invoice) < 1 ? "ok" : "fail"}`}>
                {Math.abs(total_po - total_invoice) < 1 ? "✅" : "❌"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="hitl-actions">
        <button className="btn-confirm" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "⏳ Creating..." : "✅ Confirm — Create Invoice"}
        </button>
        <button className="btn-cancel" onClick={onCancel} disabled={isLoading}>
          🚫 Cancel
        </button>
      </div>

      <p className="hitl-warning">
        ⚠️ Confirming will create a Purchase Invoice in ERPNext. This cannot be undone.
      </p>
    </div>
  )
}