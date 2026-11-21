import asyncio
import random
import time
from typing import Any, Awaitable, Callable, TypeVar

from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, RateLimitError
from fastapi import HTTPException, status

from app.core.audit import audit
from app.core.config import settings

T = TypeVar("T")

TRANSIENT_STATUS = {429, 500, 502, 503, 504}
NON_TRANSIENT_STATUS = {400, 401, 403, 404}
MAX_ATTEMPTS = 3
MAX_DELAY_SECONDS = 8.0
FAILURE_THRESHOLD = 3
COOLDOWN_SECONDS = 60.0


class CircuitOpenError(Exception):
    pass


class CircuitBreaker:
    def __init__(self) -> None:
        self.failures = 0
        self.state = "closed"
        self.opened_at = 0.0

    def allow_request(self) -> bool:
        if self.state == "open":
            elapsed = time.monotonic() - self.opened_at
            if elapsed >= COOLDOWN_SECONDS:
                self.state = "half_open"
                audit("circuit_breaker", "half_open")
                return True
            return False
        return True

    def record_success(self) -> None:
        self.failures = 0
        if self.state != "closed":
            audit("circuit_breaker", "closed")
        self.state = "closed"

    def record_failure(self) -> None:
        if self.state == "half_open":
            self.state = "open"
            self.opened_at = time.monotonic()
            self.failures = FAILURE_THRESHOLD
            audit("circuit_breaker", "open", limit_reached=FAILURE_THRESHOLD)
            return
        self.failures += 1
        if self.failures >= FAILURE_THRESHOLD:
            self.state = "open"
            self.opened_at = time.monotonic()
            audit("circuit_breaker", "open", limit_reached=FAILURE_THRESHOLD)


breaker = CircuitBreaker()


def _is_transient(exc: Exception) -> bool:
    if isinstance(exc, (RateLimitError, APITimeoutError, APIConnectionError)):
        return True
    if isinstance(exc, APIStatusError):
        code = getattr(exc, "status_code", None)
        if code in NON_TRANSIENT_STATUS:
            return False
        if code in TRANSIENT_STATUS:
            return True
    return False


def fallback_http() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=settings.SAFE_FALLBACK_MESSAGE,
    )


class LLMAdapter:
    @staticmethod
    def client() -> AsyncOpenAI:
        if not settings.llm_configured:
            raise fallback_http()
        return AsyncOpenAI(api_key=settings.LLM_API_KEY)

    @classmethod
    async def run(cls, operation: Callable[[], Awaitable[T]]) -> T:
        if not settings.llm_configured:
            audit("llm_kill_switch", "disabled")
            raise fallback_http()
        if not breaker.allow_request():
            audit("circuit_breaker", "short_circuit")
            raise fallback_http()

        last_error: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                result = await operation()
                breaker.record_success()
                return result
            except HTTPException:
                raise
            except Exception as exc:
                last_error = exc
                transient = _is_transient(exc)
                code = getattr(exc, "status_code", None)
                audit("llm_retry", "error", attempt=attempt, http_status=code, transient=transient)
                if not transient:
                    breaker.record_failure()
                    raise fallback_http() from exc
                if attempt >= MAX_ATTEMPTS:
                    breaker.record_failure()
                    raise fallback_http() from exc
                delay = min(MAX_DELAY_SECONDS, (2 ** (attempt - 1)) + random.random())
                await asyncio.sleep(delay)

        breaker.record_failure()
        raise fallback_http() from last_error

    @classmethod
    async def chat_completions(cls, **kwargs: Any) -> Any:
        client = cls.client()

        async def _call() -> Any:
            return await client.chat.completions.create(**kwargs)

        return await cls.run(_call)

    @classmethod
    async def embed(cls, text: str) -> list[float]:
        if not settings.llm_configured:
            return [0.01] * 1536
        client = cls.client()

        async def _call() -> Any:
            return await client.embeddings.create(model="text-embedding-3-small", input=text)

        response = await cls.run(_call)
        return response.data[0].embedding
