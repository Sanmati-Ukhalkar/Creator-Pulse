# Content Generation Architecture & Implementation Plan

This document outlines the architecture and step-by-step implementation tasks required to upgrade CreatorPulse's content generation from a single-step ("Generate Post") process to a high-quality, user-steered **4-Step Funnel** (Research → Curation → Hook Generation → Full Drafting).

---

## The 4-Step Architecture Flow

1. **Step 1: Ideation (Trends Analysis)**
   * **System**: Python AI Service & Node.js Backend
   * **Action**: Background worker or manual trigger aggregates recent `ingested_contents` (from RSS/Twitter). The AI analyzes this raw data, groups similarities, and outputs 3-5 high-value emerging trends/topics.
   * **Result**: Saved to the `topics` table with a `trend_score` and `keywords`.

2. **Step 2: Curation (Topic Review)**
   * **System**: React Frontend
   * **Action**: The user views AI-generated topics in the Intelligence Dashboard. They select one, optionally tweaking the description or adding a specific "Angle" (e.g., "Focus on small businesses").

3. **Step 3: Title & Hook Generation (The "Clickbait" Phase)**
   * **System**: Frontend → Backend → Python AI Service
   * **Action**: The system sends the approved Topic + Angle to `/api/generate/hooks`. The AI generates 3 to 5 distinct hooks/titles mimicking the user's `voice_samples`.
   * **Result**: User reviews and selects the strongest hook.

4. **Step 4: Full Post Drafting**
   * **System**: Frontend → Backend → Python AI Service
   * **Action**: The system sends the approved Topic + Angle + Chosen Hook to `/api/generate/post`. The AI writes the full body text designed specifically to support that hook.
   * **Result**: The final content is rendered in the text editor and saved as a draft in the `drafts` database table.

---

## Implementation Task List

### Phase 1: Python AI Service Upgrades
**Goal**: Break the monolithic generator into distinct, specialized tools.

- [x] **Task 1.1: Define New Prompt Templates**
  - Add specific prompts for trend analysis (`TREND_ANALYSIS_PROMPT`), hook generation (`HOOK_GENERATION_PROMPT`), and body drafting (`POST_BODY_PROMPT`) in `app/services/generator.py`.
- [x] **Task 1.2: Implement Trend Analysis Logic**
  - Create an `analyze_trends` function that takes raw scraped text and returns a structured JSON list of topics (Title, Description, Keyword array).
- [x] **Task 1.3: Implement Hook Generation Logic**
  - Create a `generate_hooks` function that takes a topic, angle, and voice samples, returning 3-5 hook strings in JSON format.
- [x] **Task 1.4: Refactor Post Generation Logic**
  - Update the `generate_content` function to accept a `selected_hook` string. Force the AI to use that exact hook as the first line and write the rest of the post below it.
- [x] **Task 1.5: Expose New FastAPI Endpoints**
  - Update `app/main.py` and routers to expose `POST /analyze-trends`, `POST /generate-hooks`, and `POST /generate-post`.

### Phase 2: Node.js Backend & Database Upgrades
**Goal**: Store the new data structures and proxy requests to the AI service.

- [x] **Task 2.1: Database Schema Adjustments**
  - Add optional columns to the `topics` table (if missing) for `angle` and `generated_hooks` (JSONB) to save state if the user refreshes.
- [x] **Task 2.2: Implement Trends Controller**
  - Update `trends.controller.ts` (specifically `triggerResearch`) to gather recent `ingested_contents` for the user and pass them to the AI's `/analyze-trends` endpoint.
  - Save the resulting topics into the `topics` database table.
- [x] **Task 2.3: Implement Hook Generation Controller**
  - Add a `generateHooks` method in `generate.controller.ts`.
  - Validate input (topic + angle) and pass to AI's `/generate-hooks` endpoint.
- [x] **Task 2.4: Update Post Generation Controller**
  - Update `generateController.generate` to accept `hook_text` in the request body, pass it to the AI service, and automatically insert the result into the `drafts` table.
- [x] **Task 2.5: Update Backend Routes**
  - Expose `POST /api/generate/hooks` and update `POST /api/generate` in `src/routes/content.routes.ts` or `generate.routes.ts`.

### Phase 3: React Frontend UI & Integration
**Goal**: Build a seamless UX flow for the user to steer the AI.

- [x] **Task 3.1: Intelligence Dashboard Update (Step 1 & 2)**
  - Fetch and display the generated `topics` as cards.
  - Add a button to "Trigger Deep Research" (calls the backend to read RSS feeds and find new trends).
- [x] **Task 3.2: Topic Configuration Modal (Angle)**
  - When you click a topic card, open a modal showing the Title and Description.
  - Add an input field for the user to write an "Angle" (e.g., "Make it actionable for founders").
- [x] **Task 3.3: Hook Selection UI (Step 3)**
  - In the modal, after clicking "Generate Hooks", show a loading state, then display the 3-5 hooks returned by the API.
  - Allow the user to select one hook.
- [x] **Task 3.4: Final Generation & Editor Handoff (Step 4)**
  - Add a "Write Full Post" button that activates once a hook is selected.
  - Call the final post generation endpoint.
  - Populate the result into the standard Drafts Editor for the user to publish or schedule.

---

### Priority Execution Order
1. Execute **Phase 1** (Python AI) first, as it dictates the data payload structures.
2. Execute **Phase 2** (Node.js) second to securely bridge the data to the frontend.
3. Execute **Phase 3** (Frontend) last to wire up the actual user experience.
