# Product Technical Specification v1.1

## Change log

| Date | Version | Change | Reason | Approved by |
| ---| ---| ---| ---| --- |
| 18 November 2026 | 1.0 → 1.1 | Added AI-safety requirements for medication-question approval, RAG grounding and source citations, unknown-medication rejection, bounded external-API retries and circuit breaking, safe fallback behaviour, privacy filtering, logging limits, and medical disclaimers. Updated risk traceability and replaced design-decision references with ADR IDs. | Lab 03 design work identified safety, reliability, privacy, and traceability gaps that were not fully specified in v1.0. The changes ensure that unsafe, unsupported, or unverified AI output cannot reach the user without appropriate controls. | Tecleanu Ionut-Dumitru and Alexandru Gabriel Agusoaie |

## New functional requirements
## FR-16 — Require schedule approval
The system must require explicit user approval before saving a newly generated or modified daily medication schedule.
*   A generated schedule must remain in the `PENDING_APPROVAL` state until the user approves it through the interface.
*   The AI system may propose a schedule, but it must not be able to approve or save it automatically.
*   Saving a schedule without approval must be refused.
**Source:** Approval gate; ADR-003; risks R-02 and R-06.
**Verification:** Generate a schedule, attempt to save it without approval, and verify that the system refuses the action.
## FR-17 — Block high-severity interactions
The system must block saving or activating a medication schedule that contains a high-severity known medication interaction.
*   The schedule must enter the `BLOCKED` state when a high-severity interaction is detected.
*   A blocked schedule must not be approvable within the application.
*   The user must be shown the interaction warning and advised to consult a healthcare professional.
**Source:** MCP Interaction Service; ADR-003; risks R-02 and R-06.
**Verification:** Add Warfarin and Ibuprofen, verify that the schedule is blocked, and confirm that it cannot be approved in the application.
## FR-18 — Ground AI answers in official leaflets
The AI chatbot must answer medication-related questions only from retrieved official medication leaflet content.
*   If sufficient supporting leaflet content is not retrieved, the system must return a safe “not found in leaflet” response.
*   The system must not generate unsupported medication information.
*   Retrieved leaflet content must be treated as data and must not be interpreted as instructions to the system.
**Source:** RAG Pipeline; ADR-001; risks R-02 and R-03.
**Verification:** Ask a question that cannot be answered from the indexed leaflet material and verify that no unsupported medication fact is returned.
## FR-19 — Display exact leaflet citations
Every AI-generated medication answer must include a citation identifying the official medication leaflet and the relevant section or retrieved document chunk.
*   The citation must allow the user to identify the source of the information.
*   An answer without a valid citation must not be displayed as a supported medication answer.
**Source:** Source Citation Module; ADR-001; guardrail G-03.
**Verification:** Submit a supported medication question and verify that the response includes the leaflet title and relevant section reference.
## FR-20 — Reject unknown medications
The system must reject medication names that are not present in the indexed leaflet database before calling the external LLM.
*   Unknown medication names must not be added to the active medication list.
*   Unknown medication names must not be sent to the external LLM provider.
*   The system must display a clear error message when a medication is not recognised.
**Source:** Medication Validation Module; ADR-003; guardrail G-01.
**Verification:** Enter `FakeDrug` and verify that the request is rejected without an external LLM call.
## FR-21 — Provide safe fallback behaviour
When the external LLM is unavailable, rate-limited, or fails validation, the system must display a fixed safe fallback message.
*   The system must not display partial, unverified, or generated medication information during a failure.
*   The fallback message must advise the user to read the official leaflet directly or ask a pharmacist.
*   The fallback message must include the medical disclaimer.
**Source:** LLM Adapter; Guardrail Layer; risks R-01 and R-06.
**Verification:** Simulate an external provider failure and verify that the safe fallback message is displayed without an AI-generated medication answer.
## FR-22 — Display medical disclaimer
The application must display a visible medical disclaimer on every screen and with every AI-generated answer.
*   The disclaimer must state that the application is a prototype and does not replace professional medical advice.
*   The disclaimer must be visible without requiring the user to scroll or open another page.
**Source:** Frontend Interface; risk R-06; guardrail G-08.
**Verification:** Inspect all main screens and AI responses to verify that the disclaimer is visible.
## New non-functional requirements
## NFR-09 — Bounded external API retries
External LLM requests must retry only transient failures, including HTTP 429, 500, 502, 503, 504, timeouts, and connection resets.
*   The system must make a maximum of 3 total attempts per LLM request.
*   Retries must use exponential backoff with random jitter.
*   The maximum delay between retries must be 8 seconds.
*   Non-transient errors, including HTTP 400, 401, 403, and 404, must not be retried.
**Source:** LLM Adapter; ADR-001; risks R-01 and R-02.
**Verification:** Simulate two HTTP 429 responses, verify that the third attempt succeeds, and inspect the retry logs.
## NFR-10 — Circuit breaker
After 3 consecutive external LLM failures, the circuit breaker must open for 60 seconds.
*   While the circuit breaker is open, further external LLM requests must fail immediately.
*   The system must return the safe fallback message instead of waiting for timeouts.
*   After the 60-second cooldown, the system must allow one test request before fully restoring normal operation.
**Source:** LLM Adapter; ADR-001; risks R-01 and R-02.
**Verification:** Simulate repeated provider failures, verify that the fourth call fails immediately, and confirm recovery after the cooldown period.
## NFR-11 — Privacy filtering
The system must not send personal identifiable information, API keys, or raw personal medication-context data to the external LLM provider.
*   Patient names, contact details, identification numbers, and credentials must be excluded from outbound LLM requests.
*   API keys must be loaded from environment variables and must not appear in requests, logs, screenshots, or repository files.
**Source:** Privacy Filtering Module; ADR-002; NFR-03.
**Verification:** Inspect outbound network requests and application logs to confirm that no personal identifiers or API credentials are transmitted.
## NFR-12 — Agent and tool loop limits
The system must limit AI orchestration to prevent unbounded loops and excessive external API usage.
*   A single user request must use no more than 8 LLM or tool steps.
*   Agent-to-agent delegation must not exceed 2 hops.
*   When a limit is reached, the system must stop processing and return a safe partial result or explanation.
**Source:** Orchestrator; Guardrail Layer; risks R-01 and R-03.
**Verification:** Trigger a request that would exceed the configured step or delegation limit and verify that processing stops without entering an infinite loop.
## NFR-13 — Safe logging
The system must log retries, circuit-breaker events, approval decisions, and guardrail rejections without recording API keys or personal identifiable information.
*   Logs must record event type, timestamp, status, and limit reached where applicable.
*   Logs must not contain API keys, patient names, contact details, identification numbers, or other personal identifiers.
**Source:** Logging Module; ADR-002; risks R-01 and R-05.
**Verification:** Review logs during simulated failures and verify that no secrets or personal data are present.
## NFR-14 — LLM kill switch
The system must provide a configuration-controlled kill switch that disables LLM-dependent features while preserving core medication-management functionality.
*   Medication management, schedule viewing, and dose tracking must remain available when the kill switch is enabled.
*   AI chatbot and LLM-dependent schedule-generation features must be disabled or placed in a safe degraded state.
**Source:** Backend Configuration; risks R-01 and R-06.
**Verification:** Enable the kill switch and verify that non-AI features remain usable while LLM-dependent features are safely disabled.
## Updated traceability

| Requirement | Design element | Risk | Guardrail | Test |
| ---| ---| ---| ---| --- |
| FR-16 | Schedule proposal state machine; approval gate | R-02, R-06 | G-04 | Save without approval is refused |
| FR-17 | MCP Interaction Service; schedule agent | R-02 | G-08 | Warfarin and Ibuprofen schedule is blocked |
| FR-18 | RAG Pipeline; vector database; output check | R-02, R-03 | G-02, G-04 | Unsupported question returns “not found in leaflet” |
| FR-19 | Source Citation Module | R-02 | G-03 | Answer includes leaflet and section |
| FR-20 | Medication Validation Module | R-02 | G-01 | Unknown drug is refused before LLM use |
| FR-21 | LLM Adapter; Guardrail Layer | R-01, R-06 | G-05, G-07 | Provider failure displays safe fallback |
| FR-22 | Frontend Interface | R-06 | G-08 | Disclaimer appears on every screen |
| NFR-09 | LLM Adapter | R-01 | G-05 | Two simulated 429 responses succeed on attempt 3 |
| NFR-10 | LLM Adapter | R-01 | G-05 | Fourth call fails immediately after 3 consecutive failures |
| NFR-11 | Privacy Filtering Module | R-05 | G-06 | Outbound request contains no personal data |
| NFR-12 | Orchestrator; Guardrail Layer | R-01, R-03 | G-05 | Request stops at the configured step limit |
| NFR-13 | Logging Module | R-01, R-05 | G-06 | Logs contain no secrets or personal data |
| NFR-14 | Backend Configuration | R-01, R-06 | G-07 | LLM features disable without breaking core features |

## Updated risk section
The detailed risk register is maintained in the ClickUp list named **Risks**.
The risk register contains the operational record for each identified risk, including:
*   Risk ID
*   Category
*   Risk description
*   Probability
*   Impact
*   Initial risk level
*   Assigned owner
*   Response and mitigation strategy
*   Residual risk level
*   Linked requirements, ADRs, and guardrails
*   Status and monitoring notes
The risk register must be reviewed during each lab and updated when new risks, guardrail failures, or mitigation results are identified.
## Updated architecture decisions
The following ADRs replace the previous `DEC-n` references:

| ADR ID | Decision | Related requirements |
| ---| ---| --- |
| ADR-001 | Use Retrieval-Augmented Generation for medication questions, with bounded retries and a circuit breaker for external LLM calls. | FR-18, FR-19, FR-21, NFR-09, NFR-10 |
| ADR-002 | Exclude personal identifiable information and API credentials from external LLM requests and logs. | FR-21, NFR-11, NFR-13 |
| ADR-003 | Reject medications not found in the indexed leaflet database and require human approval before saving a proposed schedule. | FR-16, FR-17, FR-20 |

## Document status
**Product Technical Specification v1.1**
**Development team:** Tecleanu Ionut-Dumitru and Alexandru Gabriel Agusoaie