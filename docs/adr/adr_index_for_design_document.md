# Architecture Decision Records (ADRs) Index

This directory contains the Architecture Decision Records for the **Patient Medication Assistant** project, tracing team decisions (`DEC-*`), functional requirements (`FR-*`), and non-functional requirements (`NFR-*`).

## Index Table (For Design Document Section 3.3)

| ADR ID | Title | Status | Decisions & Requirements Traced | Summary |
| :--- | :--- | :--- | :--- | :--- |
| **[ADR-0001](0001-use-rag-strictly-over-official-leaflets.md)** | Strict RAG Pipeline & Leaflet Verification Gate | **Accepted** | DEC-1, DEC-2, FR-08..FR-12 | Prevents medical hallucinations by enforcing official leaflet RAG and blocking unknown drugs at the ingestion gate. |
| **[ADR-0002](0002-mcp-architecture-for-drug-interactions.md)** | MCP Integration & PII Anonymization | **Accepted** | DEC-3, DEC-4, FR-07, NFR-01..NFR-04 | Isolates clinical interaction logic into an MCP tool while enforcing zero PII leakage to external LLMs and handling HTTP 429 rate limits. |
| **[ADR-0003](0003-local-vector-database-selection.md)** | Embedded Local Vector Database Selection | **Accepted** | DEC-5, DEC-6, NFR-06, NFR-07 | Selects an embedded local vector store to guarantee <10s startup time and compatibility with 8GB RAM local developer machines. |

---

### Template Used

```markdown
# ADR [Number]: [Title]

* **Status:** [Proposed | Accepted | Superseded]
* **Date:** YYYY-MM-DD
* **Authors:** [Team Members]
* **Decisions Ref:** [DEC-*]
* **Requirements Ref:** [FR-*, NFR-*]

## 1. Context and Problem Statement
## 2. Decision Drivers
## 3. Considered Options
## 4. Decision Outcome
## 5. Positive and Negative Consequences
```