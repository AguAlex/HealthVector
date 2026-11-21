# HealthVector

A medication management assistant — academic prototype only (not a substitute for professional medical advice).

The app helps you keep a medication list, generate a daily dosing schedule, mark doses as taken or missed, and ask questions about your medications. AI answers are grounded in indexed official leaflets (RAG), with source citations.

> **Disclaimer:** Prototype only. Not professional medical advice.

## What the app does

- User accounts (register / sign in)
- Active medication list (add / remove)
- Daily dose schedule, with taken / missed status
- Warnings for known medication interactions
- Chat Q&A based on official leaflets (with citations)
- Data reset and schedule export as text (per product requirements)

## Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, MUI |
| Backend | FastAPI, Uvicorn |
| Data | Supabase (PostgreSQL + pgvector) |
| AI | OpenAI (or another configured provider), RAG over leaflets |

## Requirements

- Node.js 20+
- Python 3.11+
- A Supabase project (with the `vector` extension enabled)
- An LLM API key (e.g. OpenAI)

## Setup

### 1. Database (Supabase)

1. Create a project on [Supabase](https://supabase.com).
2. Run the schema from `backend/supabase_schema.sql` in the SQL Editor.
3. Copy the **Project URL** and **anon/service key**.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
JWT_SECRET_KEY=a-random-secret-string
LLM_API_KEY=your_llm_provider_api_key
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-20b
ENVIRONMENT=development
```

Start the API:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Swagger docs: http://localhost:8000/docs  

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` should contain:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the UI:

```bash
npm run dev
```

The app usually runs at http://localhost:5173.

## Quick start

In two separate terminals:

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Then open the frontend in a browser, create an account, and add medications.

## Project structure

```
HealthVector/
├── backend/          # FastAPI (auth, medications, chat, leaflets, MCP)
├── frontend/         # React + Vite
├── docs/             # ADRs and UML diagrams
└── *.md              # Product / lab specifications
```

## Team

- Tecleanu Ionut-Dumitru — frontend  
- Alexandru Gabriel Agusoaie — backend  
