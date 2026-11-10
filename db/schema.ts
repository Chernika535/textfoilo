import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const portfolios = sqliteTable('portfolios', {
  userId: text('user_id').primaryKey(),
  document: text('document').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const publications = sqliteTable('publications', {
  userId: text('user_id').primaryKey(),
  slug: text('slug').notNull().unique(),
  document: text('document').notNull(),
  active: integer('active').notNull().default(1),
  publishedAt: text('published_at').notNull(),
});
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  objectKey: text('object_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  filename: text('filename').notNull(),
  createdAt: text('created_at').notNull(),
});
export const guestSessions = sqliteTable('guest_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
});
