import { pgTable, text, timestamp, boolean, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const draftsTable = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform"),
  content_type: text("content_type"),
  title: text("title"),
  content: jsonb("content"),
  metadata: jsonb("metadata"),
  status: text("status").default("draft").notNull(),
  scheduled_for: timestamp("scheduled_for", { withTimezone: true }),
  upstream_id: text("upstream_id"),
  upstream_status: text("upstream_status"),
  metrics: jsonb("metrics"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertDraftSchema = createInsertSchema(draftsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof draftsTable.$inferSelect;

export const sourcesTable = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  source_type: text("source_type").notNull(),
  source_name: text("source_name").notNull(),
  source_url: text("source_url"),
  source_config: jsonb("source_config"),
  is_active: boolean("is_active").default(true),
  last_sync_at: timestamp("last_sync_at", { withTimezone: true }),
  sync_status: text("sync_status").default("pending"),
  sync_error: text("sync_error"),
  metrics: jsonb("metrics"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sourcesTable.$inferSelect;

export const ingestedContentsTable = pgTable("ingested_contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  source_id: uuid("source_id").references(() => sourcesTable.id, { onDelete: "set null" }),
  url: text("url"),
  title: text("title"),
  raw_content: text("raw_content"),
  content_md: text("content_md"),
  content_html: text("content_html"),
  hash: text("hash"),
  published_at: timestamp("published_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  status: text("status"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertIngestedContentSchema = createInsertSchema(ingestedContentsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertIngestedContent = z.infer<typeof insertIngestedContentSchema>;
export type IngestedContent = typeof ingestedContentsTable.$inferSelect;

export const trendResearchTable = pgTable("trend_research", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  query: text("query"),
  title: text("title"),
  status: text("status").default("pending").notNull(),
  research_data: jsonb("research_data"),
  priority_score: integer("priority_score"),
  n8n_execution_id: text("n8n_execution_id"),
  error_message: text("error_message"),
  categories: text("categories").array(),
  generated_at: timestamp("generated_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTrendResearchSchema = createInsertSchema(trendResearchTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertTrendResearch = z.infer<typeof insertTrendResearchSchema>;
export type TrendResearch = typeof trendResearchTable.$inferSelect;

export const topicsTable = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  keywords: text("keywords").array(),
  confidence_score: integer("confidence_score"),
  trend_score: integer("trend_score"),
  is_trending: boolean("is_trending"),
  topic_type: text("topic_type"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;

export const deliveryPreferencesTable = pgTable("delivery_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  delivery_time: text("delivery_time").default("09:00"),
  frequency: text("frequency").default("daily"),
  channels: text("channels").array(),
  timezone: text("timezone").default("UTC"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertDeliveryPreferencesSchema = createInsertSchema(deliveryPreferencesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertDeliveryPreferences = z.infer<typeof insertDeliveryPreferencesSchema>;
export type DeliveryPreferences = typeof deliveryPreferencesTable.$inferSelect;

export const scheduledPostsTable = pgTable("scheduled_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform"),
  content: text("content"),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").default("pending"),
  error_message: text("error_message"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPostsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPostsTable.$inferSelect;

export const creatorProfilesTable = pgTable("creator_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  full_name: text("full_name"),
  email: text("email"),
  industry: text("industry"),
  creator_type: text("creator_type"),
  platforms: text("platforms").array(),
  timezone: text("timezone").default("UTC"),
  onboarding_completed: boolean("onboarding_completed").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertCreatorProfileSchema = createInsertSchema(creatorProfilesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type CreatorProfile = typeof creatorProfilesTable.$inferSelect;

export const platformConnectionsTable = pgTable("platform_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  platform_user_id: text("platform_user_id"),
  platform_username: text("platform_username"),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  token_expires_at: timestamp("token_expires_at", { withTimezone: true }),
  is_active: boolean("is_active"),
  last_sync_at: timestamp("last_sync_at", { withTimezone: true }),
  platform_data: jsonb("platform_data"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnectionsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type PlatformConnection = typeof platformConnectionsTable.$inferSelect;
