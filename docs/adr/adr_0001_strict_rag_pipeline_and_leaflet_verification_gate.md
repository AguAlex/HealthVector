# ADR 0001: Strict RAG Pipeline and Leaflet Verification Gate

* **Status:** Accepted
* **Date:** 2026-11-03
* **Authors:** Alexandru Gabriel Agușoaie (Backend), Teclenu Ionuț-Dumitru (Frontend)
* **Decisions Ref:** DEC-1, DEC-2
* **Requirements Ref:** FR-08, FR-09, FR-10, FR-11, FR-12

---

## 1. Context and Problem Statement

The Patient Medication Assistant is designed for medical domain usage (specifically elderly patients managing daily drug schedules). Generative Large Language Models (LLMs) inherently suffer from hallucination risks, which in a healthcare setting could lead to dangerous or fatal advice (e.g., misinforming a patient on drug interactions or dosage timing). 

We need a system mechanism that guarantees:

1. No unverified or parametric LLM medical knowledge is served directly to the user.
2. Any medication added by a user can be cross-referenced against an official drug leaflet database.
3. Every generated answer provides exact traceability to the official source text.

## 2. Decision Drivers

* **Patient Safety:** Zero tolerance for hallucinated medical advice.
* **Traceability:** Requirement to show exact leaflet sections (e.g., "Paracetamol Leaflet §4.2") for all Q&A answers (FR-10).
* **Strict Validation:** Unrecognized drugs must be blocked immediately before reaching the schedule generator (FR-11).
* **Compliance:** Explicit disclaimer on every screen stating the app is a prototype and not professional medical advice (FR-12).

## 3. Considered Options

1. **Option 1: Direct Prompting to General LLM (Zero-shot / Few-shot)**
   * *Pros:* Simple to implement, low latency.
   * *Cons:* High risk of hallucinated medical advice; no verifiable sources; violates patient safety requirements.
2. **Option 2: Fine-tuned Medical LLM Model**
   * *Pros:* High domain accuracy.
   * *Cons:* Extremely expensive to train/host locally; cannot cite dynamically loaded leaflets without retraining; violates resource constraint (NFR-06: 8GB RAM developer hardware).
3. **Option 3: Strict Retrieval-Augmented Generation (RAG) with Leaflet Hard-Gate (Chosen)**
   * *Pros:* Grounded in official text only; mandatory citations; unknown drugs are caught at the retrieval gate; low compute footprint.
   * *Cons:* System cannot answer questions for medications outside the indexed leaflet database.

## 4. Decision Outcome

**Chosen Option: Option 3 (Strict RAG with Leaflet Hard-Gate)**.

### Architecture Mechanics:

* **Ingestion Gate (DEC-2 / FR-11):** When a user inputs a drug name (e.g., `FR-01`), the backend queries the vector store for matching official leaflet embeddings. If similarity score $\le \text{Threshold}$, the drug is blocked with a `"Not found in database"` error and added neither to the active list nor the schedule.
* **Strict Context Enforcement (DEC-1 / FR-09):** The prompt template forces the LLM system prompt: *"Answer ONLY using the provided leaflet excerpts. If the context does not contain the answer, state 'Information not found in official leaflets'."*
* **Source Citation Engine (FR-10):** Document chunk metadata (Leaflet Name, Section ID) is attached to the RAG response payload and rendered in the UI.

## 5. Positive and Negative Consequences

### Positive:

* Eliminates dangerous medical hallucinations.
* Ensures 100% answer auditability via section citations.
* Fulfills acceptance criteria for FR-09, FR-10, and FR-11.

### Negative / Tradeoffs:

* **Limited Scope:** Users cannot manage drugs whose leaflets have not been ingested into `docs/leaflets/`.
* **Latency Overhead:** Vector similarity search adds ~50-150ms prior to sending prompt to the LLM endpoint.