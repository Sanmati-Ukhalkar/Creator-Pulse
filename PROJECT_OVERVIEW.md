# Creator_Pulse Project Overview

## 1. Introduction
**CreatorPulse** is an AI-powered intelligence and workflow platform designed for content creators, specifically optimized for LinkedIn. It helps creators identify trends, generate high-quality content in their own unique voice, manage their posting schedule, and track real-time engagement metrics.

---

## 2. Architecture
The project is built using a modern tri-service architecture to separate concerns and optimize performance:

- **Frontend**: A high-performance React application built with Vite and TypeScript.
- **Backend**: A Node.js/Express API handling business logic, database management, and integrations.
- **AI Service**: A Python/FastAPI service dedicated to content generation and intelligence processing using LLMs.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with Vite.
- **Styling**: Tailwind CSS, Framer Motion (for animations), and Radix UI (for accessible components).
- **State Management**: TanStack Query (Server State) and Zustand (Client State).
- **Data Visualization**: Recharts & Victory for creator metrics.
- **Icons**: Lucide React.
- **Forms**: React Hook Form + Zod validation.

### Backend
- **Environment**: Node.js with TypeScript.
- **Framework**: Express.
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Communication**: REST APIs, Webhooks, and Supabase Real-time.
- **Scheduling**: `node-cron` for automated tasks.
- **Security**: JWT, Helmet, and Express Rate Limit.

### AI Service
- **Framework**: FastAPI (Python).
- **AI Orchestration**: LangChain.
- **LLM Integration**: OpenAI (GPT-4) for content generation and analysis.
- **Utilities**: BeautifulSoup4 for web scraping/research.

---

## 4. Key Features & Implemented Functions

### 🔐 Authentication & Profile
- Full authentication flow (Signup/Login) integrated with Supabase Auth.
- User profile management and platform connection tracking.

### 🧠 Intelligence & Research
- **Trend Discovery**: Identify momentum-based topics and trending insights.
- **Source Management**: RSS feeds and LinkedIn URL ingestion for content research.
- **Topic Analysis**: Verification and categorization of relevant content topics.

### ✍️ Content Creation
- **AI Content Generator**: Generate platform-specific posts (Twitter, LinkedIn, Instagram) based on research data.
- **Voice Training**: Train the AI to mimic a creator's specific writing style and personality.
- **Draft Management**: Full CRUD operations for content drafts with status tracking (Pending, Approved, Published).

### 📅 Workflow & Delivery
- **Content Pipeline**: Visual tracking of content from idea to publication.
- **Scheduling**: Automated posting and delivery management.
- **LinkedIn Integration**: Real-time syncing of posts and engagement metrics.

### 📊 Analytics
- **Real-time Metrics**: Tracking likes, comments, and engagement scores for published LinkedIn posts.
- **Performance Prediction**: AI-driven engagement forecasting for drafts.

---

## 5. Project Structure

```text
Creator_Pulse/
├── ai-service/             # Python/FastAPI AI Service
│   ├── app/                # Application logic (routes, services, models)
│   └── requirements.txt    # Python dependencies
├── backend/                # Node.js/Express Backend
│   ├── src/                # TypeScript source code
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic (LinkedIn, Supabase, etc.)
│   │   └── server.ts       # Entry point
│   ├── migrations/         # Database schema migrations
│   └── package.json        # Backend dependencies
├── src/                    # Frontend React Application
│   ├── components/         # Reusable UI components
│   │   └── ui/             # Shadcn/UI primitives
│   ├── pages/              # Main application views (Drafts, Sources, etc.)
│   ├── store/              # Zustand state stores
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions and API clients
├── supabase/               # Supabase configuration and migrations
├── tailwind.config.ts      # Multi-theme design tokens
└── vite.config.ts          # Frontend build configuration
```

---

## 6. Development Workflow
The project runs with three concurrent services for local development:
1. **Frontend**: `npm run dev` (Root)
2. **Backend**: `npm run dev` (in `/backend`)
3. **AI Service**: `.\start_service.bat` (in `/ai-service`)

---

## 7. Future Enhancements
- WhatsApp Business API integration via Twilio.
- Enhanced vector database integration for semantic search.
- Advanced video content pipeline support.
