/**
 * Drizzle schema.
 *
 * Two concerns live in this file:
 *   1. Auth.js v5 tables (`users`, `accounts`, `sessions`, `verification_tokens`).
 *      These names + columns are dictated by `@auth/drizzle-adapter` — do not
 *      rename them.
 *   2. Application tables (`bots`, `documents`, `chunks`, `conversations`,
 *      `messages`) — multi-tenant, owned via `userId`.
 *
 * Vector column: `pgvector` extension must be enabled in the database before
 * migrations run. The init step is handled by `pgvector/pgvector:pg16` Docker
 * image, but a self-hosted Postgres needs `CREATE EXTENSION vector;` once.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// -----------------------------------------------------------------------------
// Auth.js v5 tables — names/columns fixed by @auth/drizzle-adapter
// -----------------------------------------------------------------------------

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  hashedPassword: text('hashedPassword'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// -----------------------------------------------------------------------------
// Application tables — RAG SaaS multi-tenant data
// -----------------------------------------------------------------------------

export const bots = pgTable(
  'bot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    systemPrompt: text('systemPrompt').notNull().default(
      'You are a helpful assistant. Answer using only the provided context. If the context is insufficient, say so honestly.',
    ),
    publicKey: varchar('publicKey', { length: 64 }).notNull().unique(),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('bot_user_idx').on(t.userId),
  }),
);

export const documents = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    botId: uuid('botId')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 32 }).notNull(),
    title: text('title').notNull(),
    sourceUrl: text('sourceUrl'),
    storageKey: text('storageKey'),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    error: text('error'),
    bytes: integer('bytes'),
    chunkCount: integer('chunkCount').notNull().default(0),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    botIdx: index('document_bot_idx').on(t.botId),
    statusIdx: index('document_status_idx').on(t.status),
  }),
);

// `text-embedding-3-small` returns 1536-dimensional vectors. If you swap to
// `text-embedding-3-large` (3072) or another model, regenerate this column.
export const EMBEDDING_DIMENSIONS = 1536;

export const chunks = pgTable(
  'chunk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    botId: uuid('botId')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunkIndex').notNull(),
    content: text('content').notNull(),
    tokens: integer('tokens').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    documentIdx: index('chunk_document_idx').on(t.documentId),
    botIdx: index('chunk_bot_idx').on(t.botId),
    embeddingIdx: index('chunk_embedding_idx')
      .using('hnsw', t.embedding.op('vector_cosine_ops'))
      .where(sql`${t.embedding} IS NOT NULL`),
  }),
);

export const conversations = pgTable(
  'conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    botId: uuid('botId')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    endUserId: varchar('endUserId', { length: 128 }),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    botIdx: index('conversation_bot_idx').on(t.botId),
  }),
);

export const messages = pgTable(
  'message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversationId')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    citations: jsonb('citations').$type<Array<{ chunkId: string; score: number }>>(),
    promptTokens: integer('promptTokens'),
    completionTokens: integer('completionTokens'),
    latencyMs: integer('latencyMs'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('message_conversation_idx').on(t.conversationId),
  }),
);

export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
