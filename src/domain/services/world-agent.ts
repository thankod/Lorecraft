import { z } from 'zod/v4'
import type { IStateStore, IEventStore } from '../../infrastructure/storage/interfaces.js'
import type { AgentRunner } from '../../ai/runner/agent-runner.js'
import type { StateChange } from '../models/pipeline-io.js'
import type { GameTimestamp, GameTime } from '../models/common.js'
import type { LocationState, LocationCausalEntry, FactionState, FactionCausalEntry, NPCRoughLocation } from '../models/world.js'
import type { RelationshipEntry } from '../models/character.js'
import type { CharacterDynamicState, GoalQueueEntry } from '../models/character.js'
import type { Event, EventTier1 } from '../models/event.js'
import { ResponseParser } from '../../ai/parser/response-parser.js'

// ============================================================
// Zod schema for lazy evaluation LLM response
// ============================================================

const LazyEvalResponseSchema = z.object({
  inferred_events: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    state_changes: z.array(z.string()),
  })),
  current_state_description: z.string(),
})

type LazyEvalResponse = z.infer<typeof LazyEvalResponseSchema>

// ============================================================
// Constants
// ============================================================

const PROCESSED_EVENTS_KEY = 'world:processed_events'
const GAME_TIME_KEY = 'world:game_time'
const SIGNIFICANT_WEIGHTS = new Set(['SIGNIFICANT', 'MAJOR'])
const MAX_SIGNIFICANT_EVENTS = 10

// ============================================================
// WorldAgent
// ============================================================

export class WorldAgent {
  private stateStore: IStateStore
  private eventStore: IEventStore
  private agentRunner: AgentRunner
  private evaluationLocks: Map<string, Promise<void>> = new Map()
  private lazyEvalParser: ResponseParser<LazyEvalResponse>

  constructor(stateStore: IStateStore, eventStore: IEventStore, agentRunner: AgentRunner) {
    this.stateStore = stateStore
    this.eventStore = eventStore
    this.agentRunner = agentRunner
    this.lazyEvalParser = new ResponseParser(LazyEvalResponseSchema)
  }

  // ==========================================================
  // 3.4.1 World State Updater
  // ==========================================================

  async applyStateChanges(
    event_id: string,
    state_changes: StateChange[],
    timestamp: GameTimestamp,
  ): Promise<void> {
    // Idempotency check
    const processed = await this.stateStore.get<Set<string>>(PROCESSED_EVENTS_KEY) ?? new Set<string>()
    const processedSet = processed instanceof Set ? processed : new Set<string>(processed as Iterable<string>)

    if (processedSet.has(event_id)) {
      return
    }

    for (const change of state_changes) {
      await this.applyChange(change, event_id, timestamp)
    }

    processedSet.add(event_id)
    await this.stateStore.set(PROCESSED_EVENTS_KEY, [...processedSet])

    await this.advanceGameTime()
  }

  async advanceGameTime(): Promise<void> {
    const gameTime = await this.stateStore.get<GameTime>(GAME_TIME_KEY)
    if (!gameTime) {
      return
    }

    gameTime.total_turns += 1
    gameTime.current.turn = gameTime.total_turns
    await this.stateStore.set(GAME_TIME_KEY, gameTime)
  }

  // ==========================================================
  // 3.4.2 Lazy Evaluation
  // ==========================================================

  async checkAndEvaluate(
    target_id: string,
    target_type: 'LOCATION' | 'NPC',
    current_turn: number,
  ): Promise<void> {
    const stateKey = target_type === 'LOCATION'
      ? `world:location:${target_id}`
      : `character:${target_id}:dynamic`

    const state = await this.stateStore.get<LocationState | CharacterDynamicState>(stateKey)
    if (!state) {
      return
    }

    const isFrozen = target_type === 'LOCATION'
      ? (state as LocationState).is_frozen
      : !(state as CharacterDynamicState).is_active

    if (!isFrozen) {
      return
    }

    const lastObserved = target_type === 'LOCATION'
      ? (state as LocationState).last_observed_turn
      : 0

    const elapsed = current_turn - lastObserved
    if (elapsed === 0) {
      return
    }

    // Acquire evaluation lock
    if (this.evaluationLocks.has(target_id)) {
      await this.evaluationLocks.get(target_id)
      return
    }

    const evaluation = this.performLazyEvaluation(
      target_id,
      target_type,
      state,
      elapsed,
      current_turn,
    )
    this.evaluationLocks.set(target_id, evaluation)

    try {
      await evaluation
    } finally {
      this.evaluationLocks.delete(target_id)
    }
  }

  async performLazyEvaluation(
    target_id: string,
    target_type: 'LOCATION' | 'NPC',
    state: LocationState | CharacterDynamicState,
    elapsed_turns: number,
    current_turn: number,
  ): Promise<void> {
    // Step 1: Frozen snapshot is already in `state`

    // Step 2: Scan global significant events
    const lastObservedTurn = target_type === 'LOCATION'
      ? (state as LocationState).last_observed_turn
      : 0

    const fromTimestamp: GameTimestamp = { day: 0, hour: 0, turn: lastObservedTurn }
    const toTimestamp: GameTimestamp = { day: 0, hour: 0, turn: current_turn }

    const allEvents = await this.eventStore.scanByTimeRange(fromTimestamp, toTimestamp)
    const significantEvents = allEvents
      .filter((e) => SIGNIFICANT_WEIGHTS.has(e.weight))
      .slice(0, MAX_SIGNIFICANT_EVENTS)

    // Step 3: If NPC target, load goal_queue
    let npcGoals: GoalQueueEntry[] = []
    if (target_type === 'NPC') {
      const charState = await this.stateStore.get<CharacterDynamicState>(
        `character:${target_id}:dynamic`,
      )
      if (charState?.goal_queue) {
        npcGoals = charState.goal_queue.filter((g) => g.status === 'PENDING' || g.status === 'IN_PROGRESS')
      }
    }

    // Step 4: LLM call via AgentRunner
    const systemPrompt = buildLazyEvalSystemPrompt()
    const userPrompt = buildLazyEvalUserPrompt(
      target_id,
      target_type,
      state,
      elapsed_turns,
      significantEvents,
      npcGoals,
    )

    const llmResponse = await this.agentRunner.run(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, max_tokens: 2048, agent_type: 'LazyEvalInference' },
    )

    const parseResult = this.lazyEvalParser.parse(llmResponse.content)
    if (!parseResult.success) {
      throw new Error(`LazyEval parse failed: ${parseResult.error.message}`)
    }

    const evalResult = parseResult.data

    // Step 5: Write inferred events to EventStore
    for (const inferred of evalResult.inferred_events) {
      const event: Event = {
        id: `inferred_${target_id}_${current_turn}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: inferred.title,
        timestamp: toTimestamp,
        location_id: target_type === 'LOCATION' ? target_id : (state as CharacterDynamicState).current_location_id,
        participant_ids: target_type === 'NPC' ? [target_id] : [],
        tags: ['INFERRED'],
        weight: 'MINOR',
        force_level: 0,
        created_at: Date.now(),
        summary: inferred.summary,
        choice_signals: {},
        context: `Lazy evaluation for ${target_type} ${target_id} over ${elapsed_turns} turns`,
        related_event_ids: significantEvents.map((e) => e.id),
        state_snapshot: {
          location_state: JSON.stringify(state),
          participant_states: {},
        },
        narrative_text: inferred.summary,
      }

      await this.eventStore.append(event)
    }

    // Step 6: Update state
    if (target_type === 'LOCATION') {
      const locState = state as LocationState
      locState.is_frozen = false
      locState.last_observed_turn = current_turn
      locState.current_status = evalResult.current_state_description
      await this.stateStore.set(`world:location:${target_id}`, locState)
    } else {
      const charState = state as CharacterDynamicState
      charState.is_active = true
      await this.stateStore.set(`character:${target_id}:dynamic`, charState)
    }
  }

  // ==========================================================
  // 3.4.3 Freeze / Unfreeze
  // ==========================================================

  async freezeTarget(target_id: string, current_turn: number): Promise<void> {
    // Try location first
    const locState = await this.stateStore.get<LocationState>(`world:location:${target_id}`)
    if (locState) {
      locState.is_frozen = true
      locState.last_observed_turn = current_turn
      await this.stateStore.set(`world:location:${target_id}`, locState)
      return
    }

    // Try NPC
    const charState = await this.stateStore.get<CharacterDynamicState>(
      `character:${target_id}:dynamic`,
    )
    if (charState) {
      charState.is_active = false
      await this.stateStore.set(`character:${target_id}:dynamic`, charState)
    }
  }

  async unfreezeTarget(target_id: string, current_turn: number): Promise<void> {
    // Determine target type
    const locState = await this.stateStore.get<LocationState>(`world:location:${target_id}`)
    const target_type: 'LOCATION' | 'NPC' = locState ? 'LOCATION' : 'NPC'

    await this.checkAndEvaluate(target_id, target_type, current_turn)

    // Ensure unfrozen after evaluation
    if (target_type === 'LOCATION') {
      const state = await this.stateStore.get<LocationState>(`world:location:${target_id}`)
      if (state) {
        state.is_frozen = false
        state.last_observed_turn = current_turn
        await this.stateStore.set(`world:location:${target_id}`, state)
      }
    } else {
      const state = await this.stateStore.get<CharacterDynamicState>(
        `character:${target_id}:dynamic`,
      )
      if (state) {
        state.is_active = true
        await this.stateStore.set(`character:${target_id}:dynamic`, state)
      }
    }
  }

  // ==========================================================
  // Private: apply a single StateChange
  // ==========================================================

  private async applyChange(
    change: StateChange,
    event_id: string,
    timestamp: GameTimestamp,
  ): Promise<void> {
    const { target, field, change_description } = change

    if (target.startsWith('world:location:')) {
      const locationId = target.replace('world:location:', '')
      await this.applyLocationChange(locationId, field, change_description, event_id, timestamp)
    } else if (target.startsWith('world:faction:')) {
      const factionId = target.replace('world:faction:', '')
      await this.applyFactionChange(factionId, field, change_description, event_id, timestamp)
    } else if (target.startsWith('character:') && target.endsWith(':location')) {
      const npcId = target.replace('character:', '').replace(':location', '')
      await this.applyNPCLocationChange(npcId, change_description)
    } else if (target.startsWith('relationship:')) {
      const relationshipKey = target.replace('relationship:', '')
      await this.applyRelationshipChange(relationshipKey, field, change_description, event_id)
    }
  }

  private async applyLocationChange(
    locationId: string,
    field: string,
    description: string,
    event_id: string,
    timestamp: GameTimestamp,
  ): Promise<void> {
    const key = `world:location:${locationId}`
    const state = await this.stateStore.get<LocationState>(key)
    if (!state) {
      return
    }

    const beforeStatus = state.current_status

    if (field === 'current_status') {
      state.current_status = description
    } else if (field === 'accessibility') {
      state.accessibility = description as LocationState['accessibility']
    } else if (field === 'current_occupant_ids') {
      // Interpret description as a JSON array or a single id to add/remove
      try {
        state.current_occupant_ids = JSON.parse(description)
      } catch {
        if (!state.current_occupant_ids.includes(description)) {
          state.current_occupant_ids.push(description)
        }
      }
    } else {
      // Generic field update via description
      ;(state as Record<string, unknown>)[field] = description
    }

    const causalEntry: LocationCausalEntry = {
      before_status: beforeStatus,
      change_reason: description,
      after_status: state.current_status,
      caused_by_event_id: event_id,
      timestamp,
    }
    state.causal_chain.push(causalEntry)

    await this.stateStore.set(key, state)
  }

  private async applyFactionChange(
    factionId: string,
    field: string,
    description: string,
    event_id: string,
    timestamp: GameTimestamp,
  ): Promise<void> {
    const key = `world:faction:${factionId}`
    const state = await this.stateStore.get<FactionState>(key)
    if (!state) {
      return
    }

    if (field === 'current_strength') {
      state.current_strength = description as FactionState['current_strength']
    } else if (field === 'current_status_description') {
      state.current_status_description = description
    } else if (field === 'resources_description') {
      state.resources_description = description
    } else {
      ;(state as Record<string, unknown>)[field] = description
    }

    const causalEntry: FactionCausalEntry = {
      change_description: description,
      caused_by_event_id: event_id,
      timestamp,
    }
    state.causal_chain.push(causalEntry)

    await this.stateStore.set(key, state)
  }

  private async applyNPCLocationChange(
    npcId: string,
    newLocationId: string,
  ): Promise<void> {
    const key = `world:npc_location:${npcId}`
    const gameTime = await this.stateStore.get<GameTime>(GAME_TIME_KEY)
    const currentTurn = gameTime?.total_turns ?? 0

    const npcLocation: NPCRoughLocation = {
      npc_id: npcId,
      location_id: newLocationId,
      last_updated_turn: currentTurn,
    }

    await this.stateStore.set(key, npcLocation)
  }

  private async applyRelationshipChange(
    relationshipKey: string,
    field: string,
    description: string,
    event_id: string,
  ): Promise<void> {
    const key = `relationship:${relationshipKey}`
    const entry = await this.stateStore.get<RelationshipEntry>(key)
    if (!entry) {
      return
    }

    if (field === 'semantic_description') {
      entry.semantic_description = description
    } else if (field === 'strength') {
      entry.strength = parseFloat(description)
    } else {
      ;(entry as Record<string, unknown>)[field] = description
    }

    entry.last_updated_event_id = event_id
    await this.stateStore.set(key, entry)
  }
}

// ============================================================
// Prompt builders (module-level)
// ============================================================

function buildLazyEvalSystemPrompt(): string {
  return `You are a world simulation engine for a CRPG. Your task is to infer what happened to a location or NPC during a period when the player was not present.

Given the frozen state snapshot, elapsed time, and significant global events that occurred during that period, generate plausible inferred events and a current state description.

Respond with valid JSON matching this schema:
{
  "inferred_events": [
    {
      "title": "Short event title",
      "summary": "What happened",
      "state_changes": ["Description of each state change"]
    }
  ],
  "current_state_description": "Current state after all inferred events"
}

Guidelines:
- Generate 0-3 inferred events based on elapsed time and significance of global events
- Events should be plausible given the location/NPC context
- For short elapsed periods with no significant global events, generate 0 events
- State changes should be brief, descriptive strings
- The current_state_description should reflect the state after all inferred events`
}

function buildLazyEvalUserPrompt(
  target_id: string,
  target_type: 'LOCATION' | 'NPC',
  state: LocationState | CharacterDynamicState,
  elapsed_turns: number,
  significantEvents: EventTier1[],
  npcGoals: GoalQueueEntry[],
): string {
  const parts: string[] = []

  parts.push(`Target: ${target_type} "${target_id}"`)
  parts.push(`Elapsed turns since last observation: ${elapsed_turns}`)
  parts.push(`\nFrozen state snapshot:\n${JSON.stringify(state, null, 2)}`)

  if (significantEvents.length > 0) {
    parts.push(`\nSignificant global events during this period:`)
    for (const e of significantEvents) {
      parts.push(`- [${e.weight}] "${e.title}" (turn ${e.timestamp.turn}, location: ${e.location_id})`)
    }
  } else {
    parts.push(`\nNo significant global events occurred during this period.`)
  }

  if (target_type === 'NPC' && npcGoals.length > 0) {
    parts.push(`\nNPC active goals:`)
    for (const g of npcGoals) {
      parts.push(`- [${g.status}] "${g.description}" (priority: ${g.priority})`)
    }
  }

  return parts.join('\n')
}
