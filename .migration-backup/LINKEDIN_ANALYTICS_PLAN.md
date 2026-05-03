# LinkedIn Real-Time Analytics & Status Sync Plan

This document outlines the architecture and execution steps for integrating real-time LinkedIn post analytics and lifecycle tracking (deleted, liked, updated) into CreatorPulse.

## 🎯 What We Can Build (Feature List)

### 1. Post Lifecycle & Status Tracking
*   **Live Verification:** Periodically check if a post is still live or if it was **deleted natively** on LinkedIn.
*   **Status Syncing:** Update our local database status (`published` → `deleted_upstream` or `archived`).
*   **Edit Detection:** (Optional) Detect if the post content was edited natively on LinkedIn.

### 2. Real-Time Engagement Metrics
*   **Core Metrics:** Total Likes (Reactions), Comments count, and Reposts (Shares).
*   **Impressions & Reach:** Track unique video views or article impressions (based on LinkedIn API tier).
*   **Comments Feed:** Fetch and display the actual comments right inside the CreatorPulse dashboard so the user doesn't have to leave the app.

### 3. Analytics Dashboard
*   **Performance Graph:** Visual timeline of engagement spikes over the first 24-48 hours.
*   **On-Demand Syncing:** A "Refresh Stats" button in the UI for users to pull the absolute newest data instantly.
*   **Automated Polling:** A backend cron job that automatically updates stats for all posts published in the last 7 days.

---

## 🚀 Execution Plan

### Phase 1: Database & Schema Upgrades
1.  **Update `drafts` Table:** Ensure we are storing the upstream LinkedIn URN (`linkedin_post_id`) when a post is successfully published.
2.  **Add Analytics Columns:** Add a `metrics` JSONB column (or a separate `post_analytics` table) to store `{ likes: 0, comments: 0, shares: 0, views: 0 }`.
3.  **Add Upstream Status:** Add an `upstream_status` column (`live`, `deleted`, `unknown`) to track native LinkedIn states.

### Phase 2: Backend LinkedIn API Integration
1.  **LinkedIn Metrics Service:** Create functions to hit LinkedIn's `socialActions` and `network` APIs to extract reactions and comments using the `linkedin_post_id`.
2.  **API Routes:**
    *   `GET /api/analytics/post/:id` — Fetch the latest metrics.
    *   `POST /api/analytics/sync` — Manually trigger a LinkedIn API hit to update the database.
3.  **Background Worker (Cron):** Setup a `node-cron` job that runs every hour to automatically update metrics for active posts.

### Phase 3: Frontend UI & Real-Time Dashboards
1.  **Analytics View:** Update the `Delivery` or `Drafts` published view to show real-time stats (Heart icons, Comment icons).
2.  **Manual Refresh:** Add a "Sync with LinkedIn" button on published posts.
3.  **Status Indicators:** Add UI badges showing "Live on LinkedIn" (Green) or "Deleted on LinkedIn" (Red).

### Phase 4: Testing & Rate-Limit Management
1.  **API Limits:** Build error handling for LinkedIn's strict rate limits (catching 429s).
2.  **End-to-end Test:** Publish a post, like it natively on LinkedIn, then press "Sync" in CreatorPulse to see the number update.
