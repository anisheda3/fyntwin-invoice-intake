import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react"

const EXAMPLES = [
  {
    label: "Match scenario",
    text: "We received an invoice from supplier Tech Distributors for Rs 1,25,000 — 25 units of SSD Storage at Rs 5,000 each. They say it's against PO-2024-0045.",
  },
  {
    label: "Rate mismatch",
    text: "Invoice from Tech Distributors for Rs 1,50,000 — 25 units of SSD Storage at Rs 6,000 each. Reference: PO-2024-0045.",
  },
  {
    label: "Quantity mismatch",
    text: "Supplier Tech Distributors sent invoice for 30 units of SSD Storage at Rs 5,000 each totalling Rs 1,50,000. PO reference is PO-2024-0045.",
  },
]

export default function InvoiceInput({ onSubmit, disabled, isProcessing }) {
  const [text, setText] = useState("")
  const [showExamples, setShowExamples] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const textareaRef = useRef(null)

  const handleChange = (e) => {
    setText(e.target.value)
    setCharCount(e.target.value.length)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim() && !disabled) {
      onSubmit(text.trim())
    }
  }

  const loadExample = (example) => {
    setText(example.text)
    setCharCount(example.text.length)
    setShowExamples(false)
    textareaRef.current?.focus()
  }

  return (
    <div style={styles.container}>
      {/* Section header */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionLabel}>
          <span style={styles.sectionDot} />
          Invoice Description
        </div>
        <button
          style={styles.exampleToggle}
          onClick={() => setShowExamples(!showExamples)}
          type="button"
        >
          <Sparkles size={12} />
          Examples
          {showExamples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Examples dropdown */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={styles.examples}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  style={styles.exampleBtn}
                  onClick={() => loadExample(ex)}
                  type="button"
                >
                  <span style={styles.exampleLabel}>{ex.label}</span>
                  <span style={styles.exampleText}>{ex.text.substring(0, 72)}...</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={{
          ...styles.textareaWrapper,
          ...(disabled ? styles.textareaWrapperDisabled : {}),
        }}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            value={text}
            onChange={handleChange}
            placeholder="Describe the invoice — supplier name, items, quantities, amounts, and PO reference..."
            rows={6}
            disabled={disabled}
          />
          <div style={styles.textareaFooter}>
            <span style={styles.charCount}>{charCount} chars</span>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...((!text.trim() || disabled) ? styles.submitBtnDisabled : {}),
              }}
              disabled={!text.trim() || disabled}
            >
              {isProcessing ? (
                <>
                  <motion.div
                    style={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Processing
                </>
              ) : (
                <>
                  <Send size={14} />
                  Analyse Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {disabled && !isProcessing && (
        <div style={styles.pauseNotice}>
          <span style={styles.pauseDot} />
          Awaiting confirmation — review the analysis on the right
        </div>
      )}

      <style>{inputCSS}</style>
    </div>
  )
}

const styles = {
  container: {
    padding: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  sectionDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4f8ef7, #a855f7)",
  },
  exampleToggle: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "11px",
    color: "#64748b",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
  examples: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "12px",
  },
  exampleBtn: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
    fontFamily: "'Inter', sans-serif",
  },
  exampleLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#4f8ef7",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  exampleText: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  textareaWrapper: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    overflow: "hidden",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  textareaWrapperDisabled: {
    opacity: 0.5,
  },
  textarea: {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e2e8f0",
    fontSize: "14px",
    lineHeight: "1.6",
    padding: "16px",
    resize: "none",
    fontFamily: "'Inter', sans-serif",
    display: "block",
  },
  textareaFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(255,255,255,0.02)",
  },
  charCount: {
    fontSize: "11px",
    color: "#334155",
    fontFamily: "'JetBrains Mono', monospace",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
    border: "none",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
    boxShadow: "0 4px 20px rgba(79,142,247,0.25)",
  },
  submitBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  spinner: {
    width: "13px",
    height: "13px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
  },
  pauseNotice: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
    fontSize: "12px",
    color: "#f59e0b",
    background: "rgba(245,158,11,0.08)",
    border: "1px solid rgba(245,158,11,0.15)",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  pauseDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#f59e0b",
    boxShadow: "0 0 8px #f59e0b",
    flexShrink: 0,
    animation: "blink 1.5s ease-in-out infinite",
  },
}

const inputCSS = `
  textarea:focus {
    outline: none;
  }
  div[style*="textareaWrapper"]:focus-within {
    border-color: rgba(79,142,247,0.3) !important;
    box-shadow: 0 0 0 3px rgba(79,142,247,0.08) !important;
  }
  button[style*="exampleBtn"]:hover {
    background: rgba(255,255,255,0.04) !important;
    border-color: rgba(255,255,255,0.1) !important;
  }
  button[style*="exampleToggle"]:hover {
    color: #e2e8f0 !important;
    border-color: rgba(255,255,255,0.15) !important;
  }
  button[style*="submitBtn"]:not(:disabled):hover {
    filter: brightness(1.15);
    box-shadow: 0 6px 28px rgba(79,142,247,0.4) !important;
    transform: translateY(-1px);
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`