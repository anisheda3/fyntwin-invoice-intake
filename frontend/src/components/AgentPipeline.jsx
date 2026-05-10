import { motion, AnimatePresence } from "framer-motion"
import { Check, Circle, Loader } from "lucide-react"

/*
  PIPELINE order must match the backend agent names exactly.
  The `model` field is NOT hardcoded — it comes from agents_involved.
*/
const PIPELINE_DEFS = [
  {
    id: "IntakeAgent",
    label: "Intake Agent",
    desc: "NLP extraction + RAG",
    color: "#4f8ef7",
  },
  {
    id: "ValidatorAgent",
    label: "Validator Agent",
    desc: "ERP fetch + comparison",
    color: "#a855f7",
  },
  {
    id: "ActionAgent",
    label: "Action Agent",
    desc: "Decision + execution",
    color: "#22c55e",
  },
]

function getAgentStatus(agentId, activeAgent, stage, agentsInvolved) {
  const completedStages = [
    "hitl",
    "mismatch",
    "success",
    "cancelled",
    "error",
  ]
  const agentNames = PIPELINE_DEFS.map((a) => a.id)
  const activeIdx = agentNames.indexOf(activeAgent)
  const thisIdx = agentNames.indexOf(agentId)
  const involved = agentsInvolved.some((a) => a.name === agentId)

  if (completedStages.includes(stage) && involved) return "done"
  if (stage === "processing") {
    if (activeIdx === -1) return "waiting"
    if (thisIdx < activeIdx) return "done"
    if (thisIdx === activeIdx) return "active"
    return "waiting"
  }
  if (stage === "idle") return "idle"
  return "done"
}

export default function AgentPipeline({
  agents,        // agents_involved from backend: [{name, model, ...}]
  activeAgent,
  stage,
  processingMsg,
}) {
  const isActive = stage === "processing"

  /*
    Build a lookup so each pipeline slot can show the model name
    the backend actually used — or fall back gracefully.
  */
  const modelByName = {}
  if (Array.isArray(agents)) {
    agents.forEach((a) => {
      if (a.name && a.model) modelByName[a.name] = a.model
    })
  }

  return (
    <div style={styles.container}>
      {/* Section header */}
      <div style={styles.header}>
        <span style={styles.headerLabel}>Agent Pipeline</span>
        {isActive && (
          <motion.span
            style={styles.liveTag}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ● LIVE
          </motion.span>
        )}
      </div>

      <div style={styles.pipeline}>
        {PIPELINE_DEFS.map((agent, i) => {
          const status = getAgentStatus(
            agent.id,
            activeAgent,
            stage,
            agents || []
          )

          /*
            Model label: use what the backend sent, or show a placeholder
            while idle / before the run completes.
          */
          const modelLabel =
            modelByName[agent.id] ||
            (status === "idle" || status === "waiting"
              ? "—"
              : "gemini")

          return (
            <div key={agent.id} style={styles.agentRow}>
              {/* Connector line between cards */}
              {i < PIPELINE_DEFS.length - 1 && (
                <div style={styles.connectorWrapper}>
                  <div style={styles.connector}>
                    <motion.div
                      style={{
                        ...styles.connectorFill,
                        background: agent.color,
                      }}
                      initial={{ height: "0%" }}
                      animate={{
                        height: status === "done" ? "100%" : "0%",
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Agent card */}
              <motion.div
                style={{
                  ...styles.agentCard,
                  ...(status === "active"
                    ? {
                        borderColor: `${agent.color}40`,
                        background: `${agent.color}08`,
                        boxShadow: `0 0 20px ${agent.color}15`,
                      }
                    : {}),
                  ...(status === "done"
                    ? { borderColor: `${agent.color}20` }
                    : {}),
                }}
                animate={
                  status === "active"
                    ? {
                        boxShadow: [
                          `0 0 20px ${agent.color}15`,
                          `0 0 30px ${agent.color}25`,
                          `0 0 20px ${agent.color}15`,
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                {/* Status icon */}
                <div
                  style={{
                    ...styles.statusIcon,
                    background:
                      status === "idle"
                        ? "rgba(255,255,255,0.04)"
                        : status === "done"
                        ? `${agent.color}20`
                        : `${agent.color}15`,
                    border: `1px solid ${
                      status === "idle"
                        ? "rgba(255,255,255,0.06)"
                        : agent.color + "30"
                    }`,
                  }}
                >
                  {status === "done" && (
                    <Check
                      size={12}
                      color={agent.color}
                      strokeWidth={2.5}
                    />
                  )}
                  {status === "active" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader
                        size={12}
                        color={agent.color}
                        strokeWidth={2}
                      />
                    </motion.div>
                  )}
                  {(status === "idle" || status === "waiting") && (
                    <Circle size={10} color="#334155" strokeWidth={1.5} />
                  )}
                </div>

                {/* Agent info */}
                <div style={styles.agentInfo}>
                  <div style={styles.agentName}>{agent.label}</div>
                  <div style={styles.agentDesc}>{agent.desc}</div>
                </div>

                {/* Live processing message — shown only on active agent */}
                <AnimatePresence>
                  {status === "active" && processingMsg && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      style={styles.activeMsg}
                    >
                      {processingMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/*
                  Model badge — dynamic, never hardcoded.
                  Shows the exact model string from agents_involved,
                  or "—" while idle/waiting.
                */}
                <div
                  style={{
                    ...styles.modelBadge,
                    color: agent.color,
                    background: `${agent.color}10`,
                    border: `1px solid ${agent.color}20`,
                    opacity: modelLabel === "—" ? 0.35 : 1,
                  }}
                  title={modelLabel}
                >
                  {/*
                    Truncate long model names gracefully:
                    "gemini-2.0-flash-exp" → "gemini-2.0-flash"
                    "gemini-flash-latest"  → "gemini-flash"
                  */}
                  {modelLabel.length > 18
                    ? modelLabel.substring(0, 16) + "…"
                    : modelLabel}
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────────────────── */

const styles = {
  container: {
    padding: "24px",
    flex: 1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  headerLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  liveTag: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#22c55e",
    letterSpacing: "0.08em",
  },
  pipeline: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    position: "relative",
  },
  agentRow: {
    position: "relative",
  },
  connectorWrapper: {
    position: "absolute",
    left: "19px",
    top: "52px",
    height: "20px",
    width: "2px",
    zIndex: 1,
  },
  connector: {
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "1px",
    overflow: "hidden",
  },
  connectorFill: {
    width: "100%",
    borderRadius: "1px",
  },
  agentCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "20px",
    position: "relative",
    transition: "all 0.3s ease",
    cursor: "default",
    overflow: "hidden",
  },
  statusIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agentInfo: {
    flex: 1,
    minWidth: 0,
  },
  agentName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#cbd5e1",
  },
  agentDesc: {
    fontSize: "11px",
    color: "#475569",
    marginTop: "2px",
  },
  activeMsg: {
    position: "absolute",
    bottom: "6px",
    left: "58px",
    right: "90px",
    fontSize: "10px",
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontStyle: "italic",
  },
  modelBadge: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.02em",
    flexShrink: 0,
    whiteSpace: "nowrap",
    transition: "opacity 0.3s",
  },
}