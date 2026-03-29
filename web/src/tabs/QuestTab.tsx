import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { registerTab } from './registry'
import type { QuestGraphForClient } from '../types/protocol'
import './QuestTab.css'

type QuestEntry = QuestGraphForClient['quests'][number]
type NodeEntry = QuestGraphForClient['nodes'][number]
type EdgeEntry = QuestGraphForClient['edges'][number]

function QuestTab() {
  const send = useGameStore((s) => s.send)
  const questGraph = useGameStore((s) => s.questGraph)
  const turn = useGameStore((s) => s.turn)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Refresh quest data when turn changes
  useEffect(() => {
    send({ type: 'get_quests' })
  }, [turn, send])

  const { active, completed, failed } = useMemo(() => {
    if (!questGraph) return { active: [], completed: [], failed: [] }
    const a: QuestEntry[] = []
    const c: QuestEntry[] = []
    const f: QuestEntry[] = []
    for (const q of questGraph.quests) {
      if (q.status === 'active') a.push(q)
      else if (q.status === 'completed') c.push(q)
      else f.push(q)
    }
    return { active: a, completed: c, failed: f }
  }, [questGraph])

  // Auto-select first active quest
  const allQuests = [...active, ...completed, ...failed]
  const selected = selectedId
    ? allQuests.find((q) => q.id === selectedId) ?? active[0] ?? null
    : active[0] ?? null

  // Build ordered nodes for the selected quest
  const { orderedNodes, crossQuestEdges } = useMemo(() => {
    if (!questGraph || !selected) return { orderedNodes: [], crossQuestEdges: [] }

    const questNodes = questGraph.nodes
      .filter((n) => n.quest_id === selected.id)
      .sort((a, b) => a.turn - b.turn)

    // Find edges that come from other quests into this quest's nodes
    const thisNodeIds = new Set(questNodes.map((n) => n.id))
    const cross: Array<EdgeEntry & { from_quest_id?: string }> = []
    for (const edge of questGraph.edges) {
      if (thisNodeIds.has(edge.to_node_id) && !thisNodeIds.has(edge.from_node_id)) {
        const fromNode = questGraph.nodes.find((n) => n.id === edge.from_node_id)
        cross.push({ ...edge, from_quest_id: fromNode?.quest_id })
      }
    }

    return { orderedNodes: questNodes, crossQuestEdges: cross }
  }, [questGraph, selected])

  if (!questGraph || questGraph.quests.length === 0) {
    return (
      <div className="quest-tab">
        <div className="quest-sidebar">
          <div className="quest-sidebar-empty">暂无任务</div>
        </div>
        <div className="quest-flow">
          <div className="quest-flow-empty">任务将在冒险过程中出现</div>
        </div>
      </div>
    )
  }

  return (
    <div className="quest-tab">
      <div className="quest-sidebar">
        {active.length > 0 && (
          <QuestGroup label="进行中" quests={active} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        )}
        {completed.length > 0 && (
          <QuestGroup label="已完成" quests={completed} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        )}
        {failed.length > 0 && (
          <QuestGroup label="已失败" quests={failed} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        )}
      </div>
      <div className="quest-flow">
        {selected ? (
          <>
            <h2 className="quest-flow-title">{selected.title}</h2>
            <div className="quest-flow-list">
              {orderedNodes.map((node) => {
                const crossEdge = crossQuestEdges.find((e) => e.to_node_id === node.id)
                const crossQuestName = crossEdge?.from_quest_id
                  ? questGraph.quests.find((q) => q.id === crossEdge.from_quest_id)?.title
                  : null
                return (
                  <FlowNode
                    key={node.id}
                    node={node}
                    crossQuestName={crossQuestName ?? null}
                  />
                )
              })}
            </div>
          </>
        ) : (
          <div className="quest-flow-empty">选择一个任务查看详情</div>
        )}
      </div>
    </div>
  )
}

function QuestGroup({
  label,
  quests,
  selectedId,
  onSelect,
}: {
  label: string
  quests: QuestEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="quest-sidebar-group">
      <span className="quest-sidebar-group-label">{label}</span>
      {quests.map((q) => (
        <button
          key={q.id}
          className={`quest-sidebar-item status-${q.status} ${q.id === selectedId ? 'active' : ''}`}
          onClick={() => onSelect(q.id)}
        >
          <span className="quest-sidebar-name">{q.title}</span>
        </button>
      ))}
    </div>
  )
}

function FlowNode({
  node,
  crossQuestName,
}: {
  node: NodeEntry
  crossQuestName: string | null
}) {
  const displayText = node.status === 'active' ? node.hint : node.summary

  return (
    <div className={`quest-flow-node ${crossQuestName ? 'cross-quest' : ''}`}>
      <div className={`quest-node-dot n-${node.status}`} />
      <div className="quest-node-content">
        <p className={`quest-node-text ${node.status}`}>{displayText}</p>
        <div className="quest-node-turn">
          {node.status === 'active' ? '当前' : `回合 ${node.turn}`}
        </div>
        {crossQuestName && (
          <div className="quest-node-cross-label">
            {'<-'} {crossQuestName}
          </div>
        )}
      </div>
    </div>
  )
}

registerTab({
  id: 'quests',
  label: '任务',
  icon: '\uD83D\uDCDC',
  component: QuestTab,
})
