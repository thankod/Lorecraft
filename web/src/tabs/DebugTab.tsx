import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../stores/useGameStore'
import type { DebugTurn, DebugStepEntry } from '../stores/useGameStore'
import { registerTab } from './registry'
import './DebugTab.css'

function DebugTab() {
  const initLog = useGameStore((s) => s.debugInitLog)
  const debugTurns = useGameStore((s) => s.debugTurns)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [debugTurns, initLog])

  const empty = initLog.length === 0 && debugTurns.length === 0

  return (
    <div className="debug-tab" ref={containerRef}>
      {empty ? (
        <div className="debug-empty">等待游戏开始以查看调试信息…</div>
      ) : (
        <>
          {initLog.length > 0 && <InitBlock log={initLog} />}
          {debugTurns.map((turn, i) => <TurnBlock key={i} turn={turn} isLast={i === debugTurns.length - 1} />)}
        </>
      )}
    </div>
  )
}

function InitBlock({ log }: { log: Array<{ message: string; timestamp: number }> }) {
  const [expanded, setExpanded] = useState(true)
  const t0 = log[0]?.timestamp ?? 0
  const tEnd = log[log.length - 1]?.timestamp ?? 0
  const totalMs = tEnd - t0

  return (
    <div className="debug-turn">
      <div className="debug-turn-header" onClick={() => setExpanded(!expanded)}>
        <span className="debug-chevron">{expanded ? '▼' : '▶'}</span>
        <span className="debug-turn-label">世界生成</span>
        <span className="debug-turn-input">初始化</span>
        {totalMs > 0 && <span className="debug-turn-tokens">{(totalMs / 1000).toFixed(1)}s</span>}
        <span className="debug-turn-count">{log.length} 步</span>
      </div>
      {expanded && (
        <div className="debug-turn-body">
          {log.map((entry, i) => {
            const delta = i > 0 ? entry.timestamp - log[i - 1].timestamp : 0
            return (
              <div key={i} className="debug-init-entry">
                <span className="debug-init-time">+{(delta / 1000).toFixed(1)}s</span>
                <span className="debug-init-msg">{entry.message}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TurnBlock({ turn, isLast }: { turn: DebugTurn; isLast: boolean }) {
  const [expanded, setExpanded] = useState(isLast)

  // Auto-expand the latest turn
  useEffect(() => {
    if (isLast) setExpanded(true)
  }, [isLast])

  // Group step entries into pairs (start + end)
  const steps = groupSteps(turn.steps)

  // Sum tokens across all steps
  const totalIn = steps.reduce((s, st) => s + (st.tokens?.input_tokens ?? 0), 0)
  const totalOut = steps.reduce((s, st) => s + (st.tokens?.output_tokens ?? 0), 0)

  return (
    <div className="debug-turn">
      <div className="debug-turn-header" onClick={() => setExpanded(!expanded)}>
        <span className="debug-chevron">{expanded ? '▼' : '▶'}</span>
        <span className="debug-turn-label">回合 {turn.turn}</span>
        <span className="debug-turn-input">{turn.input}</span>
        {totalIn > 0 && (
          <span className="debug-turn-tokens">in:{totalIn} out:{totalOut}</span>
        )}
        <span className="debug-turn-count">{steps.length} 步</span>
      </div>
      {expanded && (
        <div className="debug-turn-body">
          {steps.map((step, i) => (
            <StepNode key={i} step={step} />
          ))}
          {turn.states && <StateBlock states={turn.states} />}
        </div>
      )}
    </div>
  )
}

interface StepTokens {
  input_tokens: number
  output_tokens: number
  llm_calls: number
}

interface LLMCallInfo {
  agent_type: string
  duration_ms: number
  usage?: { input_tokens: number; output_tokens: number }
  messages: Array<{ role: string; content: string }>
  response: string
}

interface GroupedStep {
  name: string
  status: string
  duration_ms?: number
  data?: string
  tokens?: StepTokens
  llmCalls?: LLMCallInfo[]
  running: boolean
}

function groupSteps(entries: DebugStepEntry[]): GroupedStep[] {
  const map = new Map<string, GroupedStep>()
  const order: string[] = []

  for (const e of entries) {
    if (e.phase === 'start') {
      const key = `${e.step}_${order.length}`
      map.set(key, { name: e.step, status: 'running', running: true })
      order.push(key)
    } else {
      // Find the last running entry with this step name
      for (let i = order.length - 1; i >= 0; i--) {
        const g = map.get(order[i])
        if (g && g.name === e.step && g.running) {
          g.status = e.status ?? 'continue'
          g.duration_ms = e.duration_ms
          g.data = e.data
          // Extract token info and LLM call details from data JSON
          if (e.data) {
            try {
              const parsed = JSON.parse(e.data)
              if (parsed.tokens) {
                g.tokens = parsed.tokens as StepTokens
              }
              if (parsed.llm_calls && Array.isArray(parsed.llm_calls)) {
                g.llmCalls = parsed.llm_calls as LLMCallInfo[]
              }
            } catch { /* ignore */ }
          }
          g.running = false
          break
        }
      }
    }
  }

  return order.map((k) => map.get(k)!).filter(Boolean)
}

function StepNode({ step }: { step: GroupedStep }) {
  const [expanded, setExpanded] = useState(false)
  const hasData = !!step.data
  const hasLLM = step.llmCalls && step.llmCalls.length > 0

  const statusCls = step.running
    ? 'running'
    : step.status === 'continue'
      ? 'ok'
      : step.status === 'short_circuit'
        ? 'short-circuit'
        : 'error'

  return (
    <div className="debug-step">
      <div className="debug-step-header" onClick={() => (hasData || hasLLM) && setExpanded(!expanded)}>
        <span className={`debug-status-dot ${statusCls}`} />
        <span className="debug-step-name">{step.name}</span>
        {step.duration_ms != null && (
          <span className="debug-step-time">{step.duration_ms}ms</span>
        )}
        {step.tokens && (
          <span className="debug-step-tokens">
            in:{step.tokens.input_tokens} out:{step.tokens.output_tokens}
          </span>
        )}
        {hasLLM && <span className="debug-step-tag llm">LLM x{step.llmCalls!.length}</span>}
        {step.running && <span className="debug-step-spinner">⟳</span>}
        {step.status === 'short_circuit' && <span className="debug-step-tag sc">短路</span>}
        {step.status === 'error' && <span className="debug-step-tag err">错误</span>}
        {(hasData || hasLLM) && <span className="debug-expand-hint">{expanded ? '收起' : '展开'}</span>}
      </div>
      {expanded && (
        <div className="debug-step-body">
          {hasLLM && step.llmCalls!.map((call, i) => (
            <LLMCallCard key={i} call={call} index={i} />
          ))}
          {step.data && <pre className="debug-step-data">{formatStepData(step.data)}</pre>}
        </div>
      )}
    </div>
  )
}

/** Format step data for display, hiding llm_calls (shown as cards instead) */
function formatStepData(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    // Remove llm_calls from the display since we show them as cards
    if (parsed.llm_calls) {
      const { llm_calls: _, ...rest } = parsed
      if (Object.keys(rest).length === 0) return ''
      return JSON.stringify(rest, null, 2)
    }
    return raw
  } catch {
    return raw
  }
}

function LLMCallCard({ call, index }: { call: LLMCallInfo; index: number }) {
  const [showInput, setShowInput] = useState(false)
  const [showOutput, setShowOutput] = useState(false)

  return (
    <div className="llm-call-card">
      <div className="llm-call-header">
        <span className="llm-call-badge">LLM #{index + 1}</span>
        <span className="llm-call-agent">{call.agent_type}</span>
        <span className="llm-call-time">{call.duration_ms}ms</span>
        {call.usage && (
          <span className="llm-call-usage">
            in:{call.usage.input_tokens} out:{call.usage.output_tokens}
          </span>
        )}
      </div>
      <div className="llm-call-actions">
        <button
          className={`llm-call-toggle ${showInput ? 'active' : ''}`}
          onClick={() => setShowInput(!showInput)}
        >
          输入 ({call.messages.length} 条消息)
        </button>
        <button
          className={`llm-call-toggle ${showOutput ? 'active' : ''}`}
          onClick={() => setShowOutput(!showOutput)}
        >
          输出
        </button>
      </div>
      {showInput && (
        <div className="llm-call-messages">
          {call.messages.map((msg, i) => (
            <div key={i} className={`llm-msg llm-msg-${msg.role}`}>
              <div className="llm-msg-role">{msg.role}</div>
              <pre className="llm-msg-content">{msg.content}</pre>
            </div>
          ))}
        </div>
      )}
      {showOutput && (
        <div className="llm-call-response">
          <pre className="llm-msg-content">{formatLLMResponse(call.response)}</pre>
        </div>
      )}
    </div>
  )
}

function formatLLMResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

function StateBlock({ states }: { states: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="debug-state-block">
      <div className="debug-state-header" onClick={() => setExpanded(!expanded)}>
        <span className="debug-chevron">{expanded ? '▼' : '▶'}</span>
        <span className="debug-state-label">状态快照</span>
      </div>
      {expanded && (
        <div className="debug-state-body">
          {Object.entries(states).map(([key, value]) => (
            <StateSection key={key} label={key} data={value} />
          ))}
        </div>
      )}
    </div>
  )
}

function StateSection({ label, data }: { label: string; data: unknown }) {
  const [expanded, setExpanded] = useState(false)
  let content: string
  try {
    content = JSON.stringify(data, null, 2)
  } catch {
    content = String(data)
  }

  return (
    <div className="debug-state-section">
      <div className="debug-state-section-header" onClick={() => setExpanded(!expanded)}>
        <span className="debug-chevron">{expanded ? '▼' : '▶'}</span>
        <span>{label}</span>
      </div>
      {expanded && <pre className="debug-state-data">{content}</pre>}
    </div>
  )
}

registerTab({ id: 'debug', label: '调试', icon: '🔧', component: DebugTab })
