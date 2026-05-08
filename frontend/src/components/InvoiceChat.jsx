import { useState } from "react"

const EXAMPLE_PROMPT =
  "We received an invoice from supplier Tech Distributors for Rs 1,25,000 — " +
  "25 units of SSD Storage at Rs 5,000 each. They say it's against PO-2024-0045."

export default function InvoiceChat({ onSubmit, isLoading, disabled }) {
  const [prompt, setPrompt] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (prompt.trim()) onSubmit(prompt.trim())
  }

  return (
    <div className="chat-panel">
      <h2>📄 Invoice Intake</h2>
      <p className="chat-desc">
        Describe the supplier invoice in natural language. The AI will match it
        against the referenced Purchase Order in ERPNext.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={EXAMPLE_PROMPT}
          rows={5}
          disabled={isLoading || disabled}
        />
        <div className="chat-actions">
          <button
            type="button"
            className="btn-example"
            onClick={() => setPrompt(EXAMPLE_PROMPT)}
            disabled={isLoading || disabled}
          >
            Load Example
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={isLoading || disabled || !prompt.trim()}
          >
            {isLoading ? "⏳ Processing..." : "🚀 Process Invoice"}
          </button>
        </div>
      </form>
      {disabled && (
        <div className="awaiting-notice">
          ⏸️ Paused — confirm or cancel in the right panel.
        </div>
      )}
    </div>
  )
}