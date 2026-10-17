"""In-memory turn limits for embed BFF (no database). Resets on process restart."""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


@dataclass
class LimitConfig:
    max_turns_per_session: int = field(
        default_factory=lambda: _int_env("EMBED_MAX_TURNS_PER_SESSION", 20)
    )
    max_turns_per_ip: int = field(
        default_factory=lambda: _int_env("EMBED_MAX_TURNS_PER_IP", 60)
    )
    session_ttl_seconds: int = field(
        default_factory=lambda: _int_env("EMBED_SESSION_TTL_SECONDS", 86400)
    )
    ip_ttl_seconds: int = field(
        default_factory=lambda: _int_env("EMBED_IP_TTL_SECONDS", 3600)
    )


class TurnLimiter:
    def __init__(self, config: LimitConfig | None = None) -> None:
        self.config = config or LimitConfig()
        self._session_counts: dict[str, tuple[int, float]] = {}
        self._ip_counts: dict[str, tuple[int, float]] = {}

    def _prune(self, store: dict[str, tuple[int, float]], ttl: float) -> None:
        now = time.time()
        expired = [k for k, (_, exp) in store.items() if exp <= now]
        for k in expired:
            del store[k]

    def check_and_record(self, session_id: str | None, client_ip: str) -> tuple[bool, str]:
        cfg = self.config
        sid = (session_id or "").strip() or "anonymous"
        ip = client_ip or "unknown"

        self._prune(self._session_counts, cfg.session_ttl_seconds)
        self._prune(self._ip_counts, cfg.ip_ttl_seconds)

        now = time.time()
        s_count, s_exp = self._session_counts.get(sid, (0, now + cfg.session_ttl_seconds))
        i_count, i_exp = self._ip_counts.get(ip, (0, now + cfg.ip_ttl_seconds))

        if s_count >= cfg.max_turns_per_session:
            return False, "Session turn limit reached. Start a new chat or try again later."
        if i_count >= cfg.max_turns_per_ip:
            return False, "Too many requests from this network. Please try again later."

        self._session_counts[sid] = (s_count + 1, s_exp)
        self._ip_counts[ip] = (i_count + 1, i_exp)
        remaining = min(
            cfg.max_turns_per_session - s_count - 1,
            cfg.max_turns_per_ip - i_count - 1,
        )
        return True, str(max(0, remaining))
