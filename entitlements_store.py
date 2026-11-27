"""
GoGuide AI — User Entitlements, Trip Quotas & RevenueCat Webhook Store.

Backend source of truth for the 10 Free Trips -> Paid Pro monetization model:
  - Anonymous guests (`is_anonymous=True`): 2 free trips, max 5 days / 2 cities.
  - Signed-in free users (`is_anonymous=False`): 10 free trips (preserving `trips_used` on link),
    max 5 days / 2 cities.
  - Paid Pro users (`pro_monthly` / `pro_yearly` with `pro_expires_at > now`) or `pack_credits > 0`:
    unlimited itineraries (Pro) or top-up credits (pack), up to 30 days & multi-city routes.
  - Up to 2 minor edits per existing `trip_id` without deducting a trip credit.
  - Atomic post-success deduction: failed/timed-out generations never consume a credit.

Storage:
  - Uses PostgreSQL when `DATABASE_URL` starts with `postgres://` / `postgresql://` (and `psycopg` is installed).
  - Falls back to local SQLite (`ENTITLEMENTS_DB_PATH` or `goguide_entitlements.db`, or `:memory:` in tests).
"""

from __future__ import annotations

import datetime as dt
import logging
import os
import re
import sqlite3
import threading
from typing import Any

logger = logging.getLogger("goguide.entitlements")

FREE_GUEST_LIMIT = 2
FREE_SIGNED_IN_LIMIT = 10
FREE_MIN_DAYS = 3
FREE_MAX_DAYS = 5
FREE_MAX_CITIES = 1
PRO_MIN_DAYS = 1
PRO_MAX_DAYS = 30
PRO_MAX_CITIES = 10
FREE_MINOR_EDITS_PER_TRIP = 2
DEFAULT_PACK_CREDITS = 10


class QuotaExceededError(Exception):
    """Raised before LLM execution when a user lacks quota or Pro scope."""

    def __init__(self, payload: dict[str, Any]):
        super().__init__(payload.get("detail") or payload.get("error_code") or "QUOTA_EXCEEDED")
        self.payload = payload


def _utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _parse_iso(ts: str | None) -> dt.datetime | None:
    if not ts:
        return None
    try:
        parsed = dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed
    except ValueError:
        return None


def _ms_to_iso(ms: Any) -> str | None:
    if ms is None:
        return None
    try:
        val = float(ms)
        if val <= 0:
            return None
        return dt.datetime.fromtimestamp(val / 1000.0, tz=dt.timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _plan_type_from_product(product_id: str | None) -> str:
    pid = (product_id or "").lower()
    if "year" in pid or "annual" in pid:
        return "pro_yearly"
    return "pro_monthly"


def _pack_size_from_product(product_id: str | None) -> int:
    pid = (product_id or "").lower()
    m = re.search(r"pack[_-]?(\d+)", pid)
    if m:
        size = int(m.group(1))
        if 1 <= size <= 500:
            return size
    return DEFAULT_PACK_CREDITS


class EntitlementsStore:
    """Thread-safe SQLite/PostgreSQL entitlement store with atomic quota transactions."""

    def __init__(self, db_path: str | None = None, database_url: str | None = None):
        self._lock = threading.Lock()
        self._database_url = (database_url if database_url is not None else os.getenv("DATABASE_URL", "")).strip()
        self._use_pg = self._database_url.startswith(("postgres://", "postgresql://"))
        self._pg_mod = None
        if self._use_pg:
            try:
                import psycopg  # type: ignore
                self._pg_mod = psycopg
            except ImportError:
                logger.warning("DATABASE_URL is set but psycopg is not installed; falling back to SQLite.")
                self._use_pg = False

        if not self._use_pg:
            self._db_path = db_path or os.getenv("ENTITLEMENTS_DB_PATH") or os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "goguide_entitlements.db"
            )
            self._sqlite_conn = self._open_sqlite(self._db_path)
        else:
            self._db_path = ""
            self._sqlite_conn = None

        self._init_schema()

    def _open_sqlite(self, path: str) -> sqlite3.Connection:
        conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;") if path != ":memory:" else None
        return conn

    def _init_schema(self):
        ddl = [
            """
            CREATE TABLE IF NOT EXISTS user_entitlements (
                uid TEXT PRIMARY KEY,
                is_anonymous INTEGER NOT NULL DEFAULT 1,
                free_trips_limit INTEGER NOT NULL DEFAULT 2,
                trips_used INTEGER NOT NULL DEFAULT 0,
                plan_type TEXT NOT NULL DEFAULT 'free',
                pro_expires_at TEXT,
                pack_credits INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS trip_minor_edits (
                uid TEXT NOT NULL,
                trip_id TEXT NOT NULL,
                edits_used INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (uid, trip_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS processed_webhook_events (
                event_id TEXT PRIMARY KEY,
                processed_at TEXT NOT NULL
            )
            """,
        ]
        with self._lock:
            if self._use_pg:
                with self._pg_mod.connect(self._database_url) as conn:
                    with conn.cursor() as cur:
                        for stmt in ddl:
                            cur.execute(stmt)
                    conn.commit()
            else:
                for stmt in ddl:
                    self._sqlite_conn.execute(stmt)

    def reset_for_tests(self):
        """Re-initializes an isolated in-memory SQLite store for pytest."""
        with self._lock:
            if self._sqlite_conn is not None:
                try:
                    self._sqlite_conn.close()
                except Exception:
                    pass
            self._use_pg = False
            self._db_path = ":memory:"
            self._sqlite_conn = self._open_sqlite(":memory:")
        self._init_schema()

    def _ph(self) -> str:
        return "%s" if self._use_pg else "?"

    def _row_to_dict(self, row: Any) -> dict[str, Any]:
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            keys = ("uid", "is_anonymous", "free_trips_limit", "trips_used", "plan_type", "pro_expires_at", "pack_credits", "updated_at")
            d = dict(zip(keys, row))
        is_anon = bool(d["is_anonymous"])
        free_limit = int(d["free_trips_limit"])
        trips_used = int(d["trips_used"])
        pack_credits = int(d["pack_credits"])
        plan_type = str(d["plan_type"] or "free")
        pro_exp = _parse_iso(d.get("pro_expires_at"))
        is_pro_active = plan_type in ("pro_monthly", "pro_yearly") and pro_exp is not None and pro_exp > _utc_now()
        if plan_type in ("pro_monthly", "pro_yearly") and not is_pro_active:
            plan_type = "free"
        has_pro_scope = is_pro_active or pack_credits > 0
        return {
            "uid": d["uid"],
            "is_anonymous": is_anon,
            "free_trips_limit": free_limit,
            "trips_used": trips_used,
            "remaining_free_trips": max(0, free_limit - trips_used),
            "plan_type": plan_type,
            "pro_expires_at": d.get("pro_expires_at"),
            "pack_credits": pack_credits,
            "is_pro_active": is_pro_active,
            "min_days": PRO_MIN_DAYS if has_pro_scope else FREE_MIN_DAYS,
            "max_days": PRO_MAX_DAYS if has_pro_scope else FREE_MAX_DAYS,
            "max_cities": PRO_MAX_CITIES if has_pro_scope else FREE_MAX_CITIES,
            "updated_at": d["updated_at"],
        }

    def _ensure_user_in_tx(
        self,
        cur: Any,
        uid: str,
        is_anonymous: bool | None,
        email_verified: bool = True,
    ) -> dict[str, Any]:
        p = self._ph()
        cur.execute(
            f"SELECT uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at "
            f"FROM user_entitlements WHERE uid = {p}",
            (uid,),
        )
        row = cur.fetchone()
        now = _iso_now()
        can_unlock_signed_in_bonus = (is_anonymous is False) and bool(email_verified)
        if row is None:
            anon_flag = True if is_anonymous is None else bool(is_anonymous)
            limit = FREE_SIGNED_IN_LIMIT if (not anon_flag and bool(email_verified)) else FREE_GUEST_LIMIT
            cur.execute(
                f"INSERT INTO user_entitlements (uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at) "
                f"VALUES ({p}, {p}, {p}, 0, 'free', NULL, 0, {p})",
                (uid, 1 if anon_flag else 0, limit, now),
            )
            cur.execute(
                f"SELECT uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at "
                f"FROM user_entitlements WHERE uid = {p}",
                (uid,),
            )
            row = cur.fetchone()
        elif is_anonymous is False:
            current = self._row_to_dict(row)
            target_limit = max(current["free_trips_limit"], FREE_SIGNED_IN_LIMIT) if can_unlock_signed_in_bonus else current["free_trips_limit"]
            if current["is_anonymous"] or target_limit > current["free_trips_limit"]:
                cur.execute(
                    f"UPDATE user_entitlements SET is_anonymous = 0, free_trips_limit = {p}, updated_at = {p} WHERE uid = {p}",
                    (target_limit, now, uid),
                )
                cur.execute(
                    f"SELECT uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at "
                    f"FROM user_entitlements WHERE uid = {p}",
                    (uid,),
                )
                row = cur.fetchone()
        result = self._row_to_dict(row)
        result["email_verified"] = bool(email_verified) if not result["is_anonymous"] else False
        result["verification_required"] = (
            (not result["is_anonymous"])
            and (not bool(email_verified))
            and result["free_trips_limit"] < FREE_SIGNED_IN_LIMIT
        )
        return result

    def _run_tx(self, fn):
        with self._lock:
            if self._use_pg:
                with self._pg_mod.connect(self._database_url) as conn:
                    with conn.cursor() as cur:
                        res = fn(cur)
                    conn.commit()
                    return res
            else:
                cur = self._sqlite_conn.cursor()
                cur.execute("BEGIN IMMEDIATE")
                try:
                    res = fn(cur)
                    cur.execute("COMMIT")
                    return res
                except Exception:
                    cur.execute("ROLLBACK")
                    raise

    def sync_user(self, uid: str, is_anonymous: bool, email_verified: bool = True) -> dict[str, Any]:
        """Create user record if new, or upgrade anonymous -> verified signed-in (limit 2 -> 10, keeping trips_used)."""
        return self._run_tx(lambda cur: self._ensure_user_in_tx(cur, uid, is_anonymous, email_verified=email_verified))

    def get_entitlements(self, uid: str, is_anonymous: bool | None = None, email_verified: bool = True) -> dict[str, Any]:
        """Return current entitlements for uid (auto-creating/syncing if needed)."""
        return self._run_tx(lambda cur: self._ensure_user_in_tx(cur, uid, is_anonymous, email_verified=email_verified))

    def check_trip_entitlement(
        self,
        uid: str,
        is_anonymous: bool,
        days: int,
        cities_count: int = 1,
        is_minor_edit: bool = False,
        trip_id: str | None = None,
        email_verified: bool = True,
    ) -> tuple[str, dict[str, Any]]:
        """
        Verify quota & tier scope BEFORE running the multi-agent pipeline.
        Returns `(cost_type, entitlements)` where `cost_type` is one of:
        `'pro'`, `'minor_edit'`, `'free'`, `'pack'`.
        Raises `QuotaExceededError` (mapped to HTTP 402) if blocked.
        """
        def _check(cur):
            ent = self._ensure_user_in_tx(cur, uid, is_anonymous, email_verified=email_verified)
            p = self._ph()

            # 1. Minor edits on an existing trip: up to 2 free edits per trip_id
            if is_minor_edit and trip_id:
                cur.execute(
                    f"SELECT edits_used FROM trip_minor_edits WHERE uid = {p} AND trip_id = {p}",
                    (uid, trip_id),
                )
                erow = cur.fetchone()
                edits_used = int(erow[0]) if erow else 0
                if edits_used < FREE_MINOR_EDITS_PER_TRIP:
                    return ("minor_edit", ent)

            # 2. Scope check: Free tier is 3–5 days and max 2 cities; Pro / Pack unlocks any 1–30 days & multi-city
            has_pro_scope = ent["is_pro_active"] or ent["pack_credits"] > 0
            if not has_pro_scope:
                if days < FREE_MIN_DAYS or days > FREE_MAX_DAYS:
                    raise QuotaExceededError({
                        "error_code": "QUOTA_EXCEEDED",
                        "reason": "free_days_limit",
                        "detail": f"Free plans support {FREE_MIN_DAYS} to {FREE_MAX_DAYS} day itineraries. Upgrade to Pro for any trip length (1–{PRO_MAX_DAYS} days).",
                        "trips_used": ent["trips_used"],
                        "free_trips_limit": ent["free_trips_limit"],
                        "remaining_free_trips": ent["remaining_free_trips"],
                        "pack_credits": ent["pack_credits"],
                        "is_anonymous": ent["is_anonymous"],
                        "min_days": FREE_MIN_DAYS,
                        "max_days": FREE_MAX_DAYS,
                    })
                if cities_count > FREE_MAX_CITIES:
                    raise QuotaExceededError({
                        "error_code": "QUOTA_EXCEEDED",
                        "reason": "free_cities_limit",
                        "detail": "Free plans support 1 city per trip. Upgrade to Pro for multi-city routes.",
                        "trips_used": ent["trips_used"],
                        "free_trips_limit": ent["free_trips_limit"],
                        "remaining_free_trips": ent["remaining_free_trips"],
                        "pack_credits": ent["pack_credits"],
                        "is_anonymous": ent["is_anonymous"],
                        "max_cities": FREE_MAX_CITIES,
                    })

            # 3. Credit check
            if ent["is_pro_active"]:
                return ("pro", ent)
            if ent["trips_used"] < ent["free_trips_limit"]:
                return ("free", ent)
            if ent["pack_credits"] > 0:
                return ("pack", ent)

            if ent["is_anonymous"]:
                reason = "guest_limit_reached"
                detail = "You've used your 2 free guest trips. Sign in to unlock 8 more free trips!"
            elif ent.get("verification_required"):
                reason = "email_verification_required"
                detail = "Please verify your email address to unlock 8 more free trips!"
            else:
                reason = "free_limit_reached"
                detail = "You've used all 10 free trips. Upgrade to GoGuide Pro for unlimited itineraries!"

            raise QuotaExceededError({
                "error_code": "QUOTA_EXCEEDED",
                "reason": reason,
                "detail": detail,
                "trips_used": ent["trips_used"],
                "free_trips_limit": ent["free_trips_limit"],
                "remaining_free_trips": 0,
                "pack_credits": ent["pack_credits"],
                "is_anonymous": ent["is_anonymous"],
                "verification_required": bool(ent.get("verification_required")),
            })

        return self._run_tx(_check)

    def commit_trip_usage(self, uid: str, cost_type: str, trip_id: str | None = None) -> dict[str, Any]:
        """Atomically deduct 1 credit ONLY after trip generation succeeds."""
        def _commit(cur):
            p = self._ph()
            now = _iso_now()
            ent = self._ensure_user_in_tx(cur, uid, None)

            if cost_type == "minor_edit" and trip_id:
                cur.execute(
                    f"SELECT edits_used FROM trip_minor_edits WHERE uid = {p} AND trip_id = {p}",
                    (uid, trip_id),
                )
                erow = cur.fetchone()
                if erow is None:
                    cur.execute(
                        f"INSERT INTO trip_minor_edits (uid, trip_id, edits_used, updated_at) VALUES ({p}, {p}, 1, {p})",
                        (uid, trip_id, now),
                    )
                else:
                    cur.execute(
                        f"UPDATE trip_minor_edits SET edits_used = edits_used + 1, updated_at = {p} WHERE uid = {p} AND trip_id = {p}",
                        (now, uid, trip_id),
                    )
                return ent

            if cost_type == "free":
                cur.execute(
                    f"UPDATE user_entitlements SET trips_used = trips_used + 1, updated_at = {p} WHERE uid = {p}",
                    (now, uid),
                )
            elif cost_type == "pack":
                cur.execute(
                    f"UPDATE user_entitlements SET pack_credits = CASE WHEN pack_credits > 0 THEN pack_credits - 1 ELSE 0 END, "
                    f"updated_at = {p} WHERE uid = {p}",
                    (now, uid),
                )
            # cost_type == "pro" -> unlimited, no deduction
            cur.execute(
                f"SELECT uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at "
                f"FROM user_entitlements WHERE uid = {p}",
                (uid,),
            )
            return self._row_to_dict(cur.fetchone())

        return self._run_tx(_commit)

    def apply_revenuecat_event(self, event: dict[str, Any]) -> dict[str, Any]:
        """Process a RevenueCat webhook event idempotently."""
        event_id = str(event.get("id") or "").strip()
        event_type = str(event.get("type") or "").upper().strip()
        uid = str(event.get("app_user_id") or "").strip()
        product_id = str(event.get("product_id") or "").strip()
        expiration_iso = _ms_to_iso(event.get("expiration_at_ms"))

        if not uid or not event_type:
            raise ValueError("Missing app_user_id or event type")

        def _apply(cur):
            p = self._ph()
            now = _iso_now()
            if event_id:
                cur.execute(f"SELECT event_id FROM processed_webhook_events WHERE event_id = {p}", (event_id,))
                if cur.fetchone() is not None:
                    ent = self._ensure_user_in_tx(cur, uid, None)
                    return {"duplicate": True, "entitlements": ent}
                cur.execute(
                    f"INSERT INTO processed_webhook_events (event_id, processed_at) VALUES ({p}, {p})",
                    (event_id, now),
                )

            self._ensure_user_in_tx(cur, uid, None)

            if event_type in ("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"):
                plan = _plan_type_from_product(product_id)
                cur.execute(
                    f"UPDATE user_entitlements SET plan_type = {p}, pro_expires_at = {p}, updated_at = {p} WHERE uid = {p}",
                    (plan, expiration_iso, now, uid),
                )
            elif event_type == "NON_RENEWING_PURCHASE":
                credits_to_add = _pack_size_from_product(product_id)
                cur.execute(
                    f"UPDATE user_entitlements SET pack_credits = pack_credits + {p}, updated_at = {p} WHERE uid = {p}",
                    (credits_to_add, now, uid),
                )
            elif event_type == "CANCELLATION":
                # User retains Pro access until pro_expires_at; record updated_at only
                if expiration_iso:
                    cur.execute(
                        f"UPDATE user_entitlements SET pro_expires_at = {p}, updated_at = {p} WHERE uid = {p}",
                        (expiration_iso, now, uid),
                    )
            elif event_type == "EXPIRATION":
                cur.execute(
                    f"UPDATE user_entitlements SET plan_type = 'free', pro_expires_at = NULL, updated_at = {p} WHERE uid = {p}",
                    (now, uid),
                )

            cur.execute(
                f"SELECT uid, is_anonymous, free_trips_limit, trips_used, plan_type, pro_expires_at, pack_credits, updated_at "
                f"FROM user_entitlements WHERE uid = {p}",
                (uid,),
            )
            return {"duplicate": False, "entitlements": self._row_to_dict(cur.fetchone())}

        return self._run_tx(_apply)

