import { useState, useEffect } from "react"
import axios from "axios"
import InvoiceChat from "./components/InvoiceChat"
import HITLPanel from "./components/HITLPanel"
import DiscrepancyReport from "./components/DiscrepancyReport"
import SessionHistory from "./components/SessionHistory"
import HealthBadge from "./components/HealthBadge"
import "./App.css"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

function App() {
  const [sessionId, setSessionId] = useState(null)
  const [status, setStatus] = useState("idle")
  const [hitlPayload, setHitlPayload] = useState(null)
  const [discrepancyReport, setDiscrepancyReport] = useState(null)
  const [createdDocument, setCreatedDocument] = useState(null)
  const [message, setMessage] = useState("")
  const [agentsInvolved, setAgentsInvolved] = useState([])
  const [history, setHistory] = useState([])
  const [healthStatus, setHealthStatus] = useState(null)

  useEffect(() => {
    fetchHealth()
    fetchHistory()
  }, [])

  const fetchHealth = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/v1/health`)
      setHealthStatus(data)
    } catch {
      setHealthStatus({ status: "unhealthy", erpnext_reachable: false })
    }
  }

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/v1/history`)
      setHistory(data.sessions || [])
    } catch (e) {
      console.error("History fetch failed", e)
    }
  }

  const handleSubmit = async (prompt) => {
    setStatus("loading")
    setHitlPayload(null)
    setDiscrepancyReport(null)
    setCreatedDocument(null)
    setMessage("")

    try {
      const { data } = await axios.post(`${API_BASE}/api/v1/run`, {
        prompt,
        session_id: sessionId || undefined,
      })

      setSessionId(data.session_id)
      setAgentsInvolved(data.agents_involved || [])
      setMessage(data.message)

      if (data.status === "awaiting_confirmation") {
        setStatus("awaiting_confirmation")
        setHitlPayload(data.hitl_payload)
      } else if (data.status === "completed" && data.discrepancy_report) {
        setStatus("completed")
        setDiscrepancyReport(data.discrepancy_report)
      } else if (data.status === "error") {
        setStatus("error")
      } else {
        setStatus("completed")
      }

      await fetchHistory()
    } catch (e) {
      setStatus("error")
      setMessage(e.response?.data?.detail || "Network error. Is the backend running?")
    }
  }

  const handleConfirm = async (confirmed) => {
    setStatus("loading")
    try {
      const { data } = await axios.post(`${API_BASE}/api/v1/confirm`, {
        session_id: sessionId,
        confirmed,
      })
      setMessage(data.message)
      setCreatedDocument(data.created_document)
      setHitlPayload(null)
      setStatus(data.status)
      setSessionId(null)
      await fetchHistory()
    } catch (e) {
      setStatus("error")
      setMessage(e.response?.data?.detail || "Confirmation failed.")
    }
  }

  const handleReset = () => {
    setStatus("idle")
    setSessionId(null)
    setHitlPayload(null)
    setDiscrepancyReport(null)
    setCreatedDocument(null)
    setMessage("")
    setAgentsInvolved([])
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🧾 Fyntwin Invoice Intake</h1>
          <span className="subtitle">Accounts Payable · AI-Powered</span>
        </div>
        <HealthBadge health={healthStatus} />
      </header>

      <main className="app-main">
        <div className="left-panel">
          <InvoiceChat
            onSubmit={handleSubmit}
            isLoading={status === "loading"}
            disabled={status === "awaiting_confirmation"}
          />

          {agentsInvolved.length > 0 && (
            <div className="agent-feed">
              <h3>🤖 Agents Involved</h3>
              <div className="agent-pills">
                {agentsInvolved.map((a) => (
                  <div key={a.name} className="agent-pill">
                    <span className="agent-name">{a.name}</span>
                    <span className="agent-role">{a.role}</span>
                    <span className="agent-model">{a.model}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && status !== "awaiting_confirmation" && (
            <div className={`status-message status-${status}`}>
              {status === "completed" && createdDocument && (
                <div className="success-banner">
                  ✅ Purchase Invoice Created: <strong>{createdDocument}</strong>
                </div>
              )}
              {status === "cancelled" && (
                <div className="cancel-banner">🚫 {message}</div>
              )}
              {status === "error" && (
                <div className="error-banner">❌ {message}</div>
              )}
            </div>
          )}

          {["completed", "cancelled", "error"].includes(status) && (
            <button className="btn-reset" onClick={handleReset}>
              + New Invoice
            </button>
          )}
        </div>

        <div className="right-panel">
          {status === "awaiting_confirmation" && hitlPayload && (
            <HITLPanel
              payload={hitlPayload}
              onConfirm={() => handleConfirm(true)}
              onCancel={() => handleConfirm(false)}
              isLoading={status === "loading"}
            />
          )}
          {discrepancyReport && (
            <DiscrepancyReport report={discrepancyReport} />
          )}
          <SessionHistory sessions={history} />
        </div>
      </main>
    </div>
  )
}

export default App