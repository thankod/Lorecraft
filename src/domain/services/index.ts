export { SignalProcessor } from './signal-processor.js'
export { LocationGraph } from './location-graph.js'
export type { TraversalContext } from './location-graph.js'
export { InsistenceStateMachine } from './insistence-state-machine.js'
export { WorldAgent } from './world-agent.js'
export { NPCResponseGenerator } from './npc-response-generator.js'
export type { NPCResponseResult } from './npc-response-generator.js'
export { SubjectiveMemoryGenerator } from './subjective-memory-generator.js'
export type { MemoryEventInput } from './subjective-memory-generator.js'
export { NPCIntentGenerator } from './npc-intent-generator.js'
export type { NPCIntentResult } from './npc-intent-generator.js'
export { NPCTierManager } from './npc-tier-manager.js'
export type { NPCTierManagerConfig } from './npc-tier-manager.js'
export { ConversationManager } from './conversation-manager.js'
export { AgentScheduler } from './agent-scheduler.js'

// Phase 4: Async Systems
export {
  EventBus,
  BroadcastRouter,
  DeadLetterQueue,
  AsyncCompletionGuard,
} from './event-bus.js'
export type {
  EventSubscriber,
  DeadLetterEntry,
  RoutingResult,
} from './event-bus.js'
export { InMemoryInjectionQueueManager } from './injection-queue-manager.js'
export type { IInjectionQueueManager } from './injection-queue-manager.js'
export { NarrativeRailAgent } from './narrative-rail-agent.js'
export type { DriftAssessment, InterventionResult } from './narrative-rail-agent.js'
export { LoreCanonicalizer } from './lore-canonicalizer.js'
export type { ExtractedFact, ConsistencyVerdict } from './lore-canonicalizer.js'
export { PropagationScheduler } from './propagation-scheduler.js'
export type { PropagationEntry } from './propagation-scheduler.js'

// Phase 5: Integration
export { InitializationAgent } from './initialization-agent.js'
export { SaveLoadSystem } from './save-load-system.js'
export {
  ExtensionConfigLoader,
  AuthorTooling,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_COGNITIVE_VOICES,
  DEFAULT_TIER_C_TEMPLATES,
} from './extension-config.js'
export type {
  StyleConfig,
  CognitiveVoiceConfig,
  IAuthorTooling,
} from './extension-config.js'
