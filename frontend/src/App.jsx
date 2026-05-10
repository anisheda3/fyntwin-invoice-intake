import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import Header from "./components/Header"
import InvoiceInput from "./components/InvoiceInput"
import AgentPipeline from "./components/AgentPipeline"
import HITLConfirmation from "./components/HITLConfirmation"
import DiscrepancyView from "./components/DiscrepancyView"
import SuccessView from "./components/SuccessView"
import SessionDrawer from "./components/SessionDrawer"
import StatusBar from "./components/StatusBar"

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000"

const STAGES = {
  idle: "idle",
  processing: "processing",
  hitl: "hitl",
  mismatch: "mismatch",
  success: "success",
  error: "error",
  cancelled: "cancelled",
}

export default function App() {
  const [stage, setStage] = useState(STAGES.idle)
  const [sessionId, setSessionId] = useState(null)
  const [hitlPayload, setHitlPayload] = useState(null)
  const [discrepancyReport, setDiscrepancyReport] = useState(null)
  const [createdDoc, setCreatedDoc] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [agentsInvolved, setAgentsInvolved] = useState([])
  const [activeAgent, setActiveAgent] = useState(null)
  const [history, setHistory] = useState([])
  const [health, setHealth] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [processingMsg, setProcessingMsg] = useState("")

  useEffect(() => {
    pingHealth()
    loadHistory()
    const hInterval = setInterval(pingHealth, 30000)
    return () => clearInterval(hInterval)
  }, [])

  const pingHealth = async () => {
    try {
      const { data } = await axios.get(`${API}/api/v1/health`)
      setHealth(data)
    } catch {
      setHealth({ status: "unhealthy", erpnext_reachable: false })
    }
  }

  const loadHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/api/v1/history`)
      setHistory(data.sessions || [])
    } catch (e) {
      console.error("History load failed", e)
    }
  }

  // Simulate agent activity during processing
  const simulateAgentProgress = useCallback(() => {
    const steps = [
      { agent: "IntakeAgent", msg: "Parsing invoice details..." },
      { agent: "IntakeAgent", msg: "Extracting line items and amounts..." },
      { agent: "ValidatorAgent", msg: "Fetching Purchase Order from ERPNext..." },
      { agent: "ValidatorAgent", msg: "Comparing fields against invoice..." },
      { agent: "ActionAgent", msg: "Evaluating match result..." },
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < steps.length) {
        setActiveAgent(steps[i].agent)
        setProcessingMsg(steps[i].msg)
        i++
      } else {
        clearInterval(interval)
      }
    }, 1800)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (prompt) => {
    setStage(STAGES.processing)
    setHitlPayload(null)
    setDiscrepancyReport(null)
    setCreatedDoc(null)
    setErrorMsg("")
    setAgentsInvolved([])

    const cleanup = simulateAgentProgress()

    try {
      const { data } = await axios.post(`${API}/api/v1/run`, {
        prompt,
        session_id: sessionId || undefined,
      })

      cleanup()
      setActiveAgent(null)
      setSessionId(data.session_id)
      setAgentsInvolved(data.agents_involved || [])

      if (data.status === "awaiting_confirmation") {
        setHitlPayload(data.hitl_payload)
        setStage(STAGES.hitl)
      } else if (data.status === "completed" && data.discrepancy_report) {
        setDiscrepancyReport(data.discrepancy_report)
        setStage(STAGES.mismatch)
      } else if (data.status === "error") {
        setErrorMsg(data.message)
        setStage(STAGES.error)
      } else {
        setStage(STAGES.idle)
      }

      await loadHistory()
    } catch (e) {
      cleanup()
      setActiveAgent(null)
      setErrorMsg(e.response?.data?.detail || "Cannot reach backend. Is it running?")
      setStage(STAGES.error)
    }
  }

  const handleConfirm = async (confirmed) => {
    setStage(STAGES.processing)
    setProcessingMsg(confirmed ? "Creating Purchase Invoice in ERPNext..." : "Cancelling operation...")
    setActiveAgent("ActionAgent")

    try {
      const { data } = await axios.post(`${API}/api/v1/confirm`, {
        session_id: sessionId,
        confirmed,
      })

      setActiveAgent(null)

      if (confirmed && data.status === "completed") {
        setCreatedDoc(data.created_document)
        setStage(STAGES.success)
      } else {
        setStage(STAGES.cancelled)
      }

      setSessionId(null)
      await loadHistory()
    } catch (e) {
      setActiveAgent(null)
      setErrorMsg(e.response?.data?.detail || "Confirmation failed.")
      setStage(STAGES.error)
    }
  }

  const handleReset = () => {
    setStage(STAGES.idle)
    setSessionId(null)
    setHitlPayload(null)
    setDiscrepancyReport(null)
    setCreatedDoc(null)
    setErrorMsg("")
    setAgentsInvolved([])
    setActiveAgent(null)
    setProcessingMsg("")
  }

  return (
    <div className="app-shell">
      {/* Ambient background effects */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />

      <Header
        health={health}
        onHistoryClick={() => setDrawerOpen(true)}
        sessionCount={history.length}
      />

      <main className="app-body">
        {/* Left column — always visible */}
        <div className="left-col">
          <InvoiceInput
            onSubmit={handleSubmit}
            disabled={stage === STAGES.processing || stage === STAGES.hitl}
            isProcessing={stage === STAGES.processing}
          />

          <AgentPipeline
            agents={agentsInvolved}
            activeAgent={activeAgent}
            stage={stage}
            processingMsg={processingMsg}
          />
        </div>

        {/* Right column — contextual content */}
        <div className="right-col">
          <AnimatePresence mode="wait">
            {stage === STAGES.idle && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <IdleState />
              </motion.div>
            )}

            {stage === STAGES.processing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
              >
                <ProcessingState message={processingMsg} agent={activeAgent} />
              </motion.div>
            )}

            {stage === STAGES.hitl && hitlPayload && (
              <motion.div
                key="hitl"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
              >
                <HITLConfirmation
                  payload={hitlPayload}
                  onConfirm={() => handleConfirm(true)}
                  onCancel={() => handleConfirm(false)}
                />
              </motion.div>
            )}

            {stage === STAGES.mismatch && discrepancyReport && (
              <motion.div
                key="mismatch"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
              >
                <DiscrepancyView
                  report={discrepancyReport}
                  onReset={handleReset}
                />
              </motion.div>
            )}

            {stage === STAGES.success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, type: "spring" }}
              >
                <SuccessView document={createdDoc} onReset={handleReset} />
              </motion.div>
            )}

            {stage === STAGES.cancelled && (
              <motion.div
                key="cancelled"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CancelledState onReset={handleReset} />
              </motion.div>
            )}

            {stage === STAGES.error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ErrorState message={errorMsg} onReset={handleReset} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <StatusBar health={health} stage={stage} sessionId={sessionId} />

      <SessionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={history}
      />

      <style>{globalStyles}</style>
    </div>
  )
}

// ── Inline state components ────────────────────────────────────────────────

function IdleState() {
  return (
    <div className="idle-state">
      <div className="idle-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="31" stroke="url(#grad1)" strokeWidth="1.5" strokeDasharray="4 4"/>
          <path d="M20 24h24M20 32h24M20 40h16" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round"/>
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4f8ef7"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
            <linearGradient id="grad2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4f8ef7"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h2 className="idle-title">Ready to Process</h2>
      <p className="idle-desc">
        Describe an incoming supplier invoice in natural language.<br />
        The AI team will validate it against your ERPNext Purchase Orders.
      </p>
      <div className="idle-features">
        <div className="idle-feature">
          <span className="feature-dot blue" />
          NLP Invoice Parsing with RAG
        </div>
        <div className="idle-feature">
          <span className="feature-dot purple" />
          Real-time ERP Validation
        </div>
        <div className="idle-feature">
          <span className="feature-dot green" />
          Human-in-the-Loop Approval
        </div>
      </div>
    </div>
  )
}

function ProcessingState({ message, agent }) {
  return (
    <div className="processing-state">
      <div className="processing-orb">
        <div className="orb-ring orb-ring-1" />
        <div className="orb-ring orb-ring-2" />
        <div className="orb-ring orb-ring-3" />
        <div className="orb-core" />
      </div>
      <div className="processing-text">
        {agent && (
          <span className="processing-agent">{agent}</span>
        )}
        <p className="processing-msg">{message || "Initialising agent team..."}</p>
      </div>
    </div>
  )
}

function CancelledState({ onReset }) {
  return (
    <div className="result-state cancelled-state">
      <div className="result-icon cancelled-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="#f59e0b" strokeWidth="1.5"/>
          <path d="M10 16h12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3>Operation Cancelled</h3>
      <p>Purchase Invoice creation was cancelled. The Purchase Order remains open and unaffected.</p>
      <button className="btn-ghost" onClick={onReset}>
        Process Another Invoice
      </button>
    </div>
  )
}

function ErrorState({ message, onReset }) {
  return (
    <div className="result-state error-state">
      <div className="result-icon error-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="#ef4444" strokeWidth="1.5"/>
          <path d="M16 10v8M16 22v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3>Something went wrong</h3>
      <p className="error-detail">{message}</p>
      <button className="btn-ghost" onClick={onReset}>
        Try Again
      </button>
    </div>
  )
}

// ── Global styles ──────────────────────────────────────────────────────────
const globalStyles = `
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  /* Ambient background */
  .bg-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    z-index: 0;
  }
  .bg-orb-1 {
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%);
    top: -200px; left: -100px;
  }
  .bg-orb-2 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%);
    bottom: -100px; right: -100px;
  }
  .bg-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  .app-body {
    flex: 1;
    display: grid;
    grid-template-columns: 480px 1fr;
    gap: 0;
    position: relative;
    z-index: 1;
    min-height: 0;
  }

  .left-col {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    overflow-y: auto;
    max-height: calc(100vh - 112px);
  }

  .right-col {
    display: flex;
    flex-direction: column;
    padding: 32px;
    overflow-y: auto;
    max-height: calc(100vh - 112px);
  }

  /* Idle state */
  .idle-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    text-align: center;
    gap: 20px;
  }
  .idle-icon {
    opacity: 0.7;
    animation: float 4s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .idle-title {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #e2e8f0, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .idle-desc {
    color: #64748b;
    font-size: 14px;
    line-height: 1.7;
    max-width: 340px;
  }
  .idle-features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
  }
  .idle-feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
  .feature-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .feature-dot.blue { background: #4f8ef7; box-shadow: 0 0 8px #4f8ef7; }
  .feature-dot.purple { background: #a855f7; box-shadow: 0 0 8px #a855f7; }
  .feature-dot.green { background: #22c55e; box-shadow: 0 0 8px #22c55e; }

  /* Processing state */
  .processing-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    gap: 32px;
  }
  .processing-orb {
    position: relative;
    width: 100px; height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .orb-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid transparent;
  }
  .orb-ring-1 {
    width: 100px; height: 100px;
    border-top-color: #4f8ef7;
    border-right-color: rgba(79,142,247,0.3);
    animation: spin 2s linear infinite;
  }
  .orb-ring-2 {
    width: 76px; height: 76px;
    border-top-color: #a855f7;
    border-left-color: rgba(168,85,247,0.3);
    animation: spin 1.5s linear infinite reverse;
  }
  .orb-ring-3 {
    width: 52px; height: 52px;
    border-top-color: #22c55e;
    border-right-color: rgba(34,197,94,0.3);
    animation: spin 1s linear infinite;
  }
  .orb-core {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: radial-gradient(circle, #4f8ef7, #a855f7);
    box-shadow: 0 0 20px rgba(79,142,247,0.5);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
  }
  .processing-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .processing-agent {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #4f8ef7;
    background: rgba(79,142,247,0.1);
    border: 1px solid rgba(79,142,247,0.2);
    padding: 3px 10px;
    border-radius: 20px;
    letter-spacing: 0.05em;
  }
  .processing-msg {
    font-size: 14px;
    color: #64748b;
    text-align: center;
  }

  /* Result states */
  .result-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    gap: 16px;
    text-align: center;
  }
  .result-state h3 {
    font-size: 20px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .result-state p {
    color: #64748b;
    font-size: 14px;
    max-width: 360px;
    line-height: 1.6;
  }
  .error-detail {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px !important;
    color: #ef4444 !important;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    padding: 12px 16px;
    border-radius: 8px;
    max-width: 400px;
    text-align: left !important;
  }

  /* Ghost button */
  .btn-ghost {
    margin-top: 8px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #94a3b8;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .btn-ghost:hover {
    border-color: rgba(255,255,255,0.2);
    color: #e2e8f0;
    background: rgba(255,255,255,0.04);
  }

  @media (max-width: 960px) {
    .app-body {
      grid-template-columns: 1fr;
    }
    .left-col {
      border-right: none;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      max-height: none;
    }
    .right-col { max-height: none; }
  }
`