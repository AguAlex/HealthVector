# ADR 0002: Model Context Protocol (MCP) Integration and PII Anonymization

* **Status:** Accepted
* **Date:** 2026-11-03
* **Authors:** Alexandru Gabriel Agușoaie (Backend), Teclenu Ionuț-Dumitru (Frontend)
* **Decisions Ref:** DEC-3, DEC-4
* **Requirements Ref:** FR-07, NFR-01, NFR-02, NFR-03, NFR-04

---

## 1. Context and Problem Statement

The application must evaluate complex interactions between active drugs (e.g., Warfarin + Aspirin) and respond within strict performance bounds (< 5 seconds, NFR-01). Furthermore, strict privacy constraints dictate that no Personally Identifiable Information (PII) may be leaked to external cloud LLM APIs (NFR-03), and API keys must be isolated securely (NFR-04).

We need an architectural pattern that decouples the LLM orchestrator from deterministic rule evaluation while maintaining strict data anonymization and rate-limit handling.

## 2. Decision Drivers

* **Privacy & Security:** Zero PII transmission to external endpoints (NFR-03, DEC-4). Secure key management (NFR-04).
* **Determinism:** Interaction checking must rely on deterministic clinical rules rather than LLM probabilistic guessing.
* **Performance:** End-to-end execution of interaction checks must complete under 5 seconds (NFR-01, DEC-3).
* **Resilience:** Graceful degrading when external cloud services hit HTTP 429 rate limits (NFR-02).

## 3. Considered Options

1. **Option 1: Direct Tool Calling via Monolithic Backend Functions**
   * *Pros:* Simple procedural code.
   * *Cons:* Tight coupling between orchestrator logic and interaction databases; hard to scale or test in isolation.
2. **Option 2: Standard REST Microservice for Interaction Engine**
   * *Pros:* Decoupled backend architecture.
   * *Cons:* High boilerplate HTTP overhead; lacks standardized agent-tool discovery interface.
3. **Option 3: Model Context Protocol (MCP) Server with PII Sanitization Gateway (Chosen)**
   * *Pros:* Standardized open protocol for LLM tool binding; isolated deterministic execution; clean separation of interaction rules from prompt orchestration.
   * *Cons:* Additional IPC/socket serialization overhead.

## 4. Decision Outcome

**Chosen Option: Option 3 (MCP Server with PII Sanitization Gateway)**.

### Architecture Mechanics:
1. **PII Anonymization Filter (NFR-03):** An intermediary layer strips patient identity, IP addresses, or session tokens before constructing the payload. Only standardized drug identifiers (e.g., `["Warfarin", "Aspirin"]`) and query strings are passed.
2. **MCP Interaction Tool (FR-07):** The backend orchestrator delegates interaction checks to a dedicated MCP server. The tool performs a lookup against verified matrix tables and returns structured severity alerts (`CRITICAL`, `WARNING`, `SAFE`).
3. **Resilience Middleware (NFR-02):** Wrapped around the external LLM provider interface using Exponential Backoff and Fallback handlers for `HTTP 429` responses.

## 5. Positive and Negative Consequences

### Positive:
* Complete isolation of clinical logic inside a standalone, testable MCP server.
* Guaranteed compliance with privacy mandates (NFR-03).
* Response times remain well under the 5-second threshold (NFR-01).

### Negative / Tradeoffs:
* Requires maintaining MCP server schemas and message serialization contracts.
* Additional error handling required for local IPC socket disconnects.