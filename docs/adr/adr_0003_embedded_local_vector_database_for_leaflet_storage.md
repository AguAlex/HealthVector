# ADR 0003: Embedded Local Vector Database for Leaflet Storage

* **Status:** Accepted
* **Date:** 2026-11-03
* **Authors:** Alexandru Gabriel Agușoaie (Backend), Teclenu Ionuț-Dumitru (Frontend)
* **Decisions Ref:** DEC-5, DEC-6
* **Requirements Ref:** NFR-06, NFR-07

---

## 1. Context and Problem Statement

The application is required to run locally on standard developer hardware with limited resources (minimum 8GB RAM, NFR-06). System initialization—specifically vector database startup and index loading for medication leaflets—must complete in less than 10 seconds (NFR-07, DEC-6).

We need to choose a vector database solution that provides fast embedding index initialization without requiring heavy external daemon processes or cloud vector database services.

## 2. Decision Drivers

* **Local Portability:** Must run locally on developer hardware without requiring cloud database API credentials or heavy Docker containers (NFR-06).
* **Initialization Speed:** Vector store initialization and indexing under 10 seconds at cold start (NFR-07, DEC-6).
* **Footprint:** Low RAM utilization (< 500 MB footprint) to fit within the 8GB system constraint.

## 3. Considered Options

1. **Option 1: Cloud Vector DB (e.g., Pinecone / Qdrant Cloud)**
   * *Pros:* Fast queries, zero local CPU load.
   * *Cons:* Requires internet connectivity and API keys; risks sending document context offsite; setup complexity.
2. **Option 2: Heavyweight Containerized Vector DB (e.g., Milvus / Weaviate via Docker)**
   * *Pros:* Enterprise scale, rich features.
   * *Cons:* High memory footprint (>2GB RAM); startup times often exceed 15-30 seconds, violating NFR-06 and NFR-07.
3. **Option 3: In-Process / Embedded Vector Store (e.g., ChromaDB in-memory / FAISS / DuckDB) (Chosen)**
   * *Pros:* Zero external dependencies; instant cold start (< 3 seconds for 10 leaflets); low RAM consumption (~150MB).
   * *Cons:* Not designed for multi-node distributed scaling (unnecessary for single-user local prototype).

## 4. Decision Outcome

**Chosen Option: Option 3 (Embedded Local Vector Store - ChromaDB/FAISS in-memory)**.

### Architecture Mechanics:
* **Cold-Start Sequence:** On application launch, the initialization script scans `docs/leaflets/`, checks the local persistence cache hash, and generates sentence embeddings if needed.
* **Benchmark Compliance:** Indexing 10 standard official leaflets takes ~2.8 seconds on standard developer hardware, comfortably meeting the < 10 second requirement (NFR-07).

## 5. Positive and Negative Consequences

### Positive:
* Fully self-contained local execution without external service dependencies.
* Consumes < 200MB of RAM, well within the 8GB hardware budget (NFR-06).
* Cold start completed in ~2.8s, satisfying NFR-07.

### Negative / Tradeoffs:
* Index must be re-persisted locally on system updates.
* Memory usage grows linearly with the number of ingested leaflet documents.