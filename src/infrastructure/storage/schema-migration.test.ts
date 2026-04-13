import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { initializeSchema } from './sqlite-schema.js'

describe('schema migration', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('repairs old runtime tables even when schema_version is already 3', () => {
    db = new Database(':memory:')

    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('schema_version', '3');

      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        turn INTEGER NOT NULL,
        day INTEGER NOT NULL DEFAULT 0,
        hour INTEGER NOT NULL DEFAULT 0,
        location_id TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        weight TEXT NOT NULL,
        force_level INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        choice_signals TEXT NOT NULL DEFAULT '{}',
        context TEXT NOT NULL DEFAULT '',
        related_event_ids TEXT NOT NULL DEFAULT '[]',
        state_snapshot TEXT NOT NULL DEFAULT '{}',
        narrative_text TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE npc_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        npc_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        subjective_summary TEXT NOT NULL,
        distortion_type TEXT NOT NULL,
        recorded_at_turn INTEGER NOT NULL,
        location_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE lore (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        fact_type TEXT NOT NULL,
        authority_level TEXT NOT NULL,
        source_event_id TEXT,
        created_at_turn INTEGER NOT NULL,
        causal_chain TEXT NOT NULL DEFAULT '[]',
        related_lore_ids TEXT NOT NULL DEFAULT '[]',
        content_hash TEXT NOT NULL
      );
    `)

    expect(() => initializeSchema(db!)).not.toThrow()

    const eventCols = db.prepare(`PRAGMA table_info(events)`).all() as Array<{ name: string }>
    const memoryCols = db.prepare(`PRAGMA table_info(npc_memories)`).all() as Array<{ name: string }>
    const loreCols = db.prepare(`PRAGMA table_info(lore)`).all() as Array<{ name: string }>

    expect(eventCols.some((col) => col.name === 'session_id')).toBe(true)
    expect(memoryCols.some((col) => col.name === 'session_id')).toBe(true)
    expect(loreCols.some((col) => col.name === 'session_id')).toBe(true)
  })
})
