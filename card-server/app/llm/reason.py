from __future__ import annotations

import logging
import threading

from app.config import settings

log = logging.getLogger(__name__)

# 로컬 LLM 동시 호출 제한 (OOM 방지). 모든 워커 스레드가 공유한다. (spec: LLM_CONCURRENCY)
_llm_lock = threading.Semaphore(settings.LLM_CONCURRENCY)

_client = None


def _ollama():
    global _client
    if _client is None:
        from ollama import Client

        _client = Client(host=settings.OLLAMA_HOST, timeout=settings.OLLAMA_TIMEOUT)
    return _client


_SYSTEM_PROMPT = (
    "너는 신용카드 추천 사유를 작성하는 한국어 어시스턴트다. "
    "회원의 소비 패턴과 카드 혜택을 근거로 한 문장(80자 이내)으로 추천 사유를 쓴다. "
    "과장 없이 담백하게 쓰고, 큰따옴표나 목록 없이 한 문장만 출력한다."
)

# reason 컬럼 길이 제한(varchar 300)에 맞춰 안전하게 자른다.
_MAX_REASON_LEN = 290


def build_reason(
    *,
    card_name: str,
    matched_category_names: list[str],
    annual_fee: int | None,
) -> str:
    """추천 사유 문장을 생성한다.

    USE_LLM_REASON=True 이고 Ollama 호출에 성공하면 LLM 문장을, 실패하거나
    비활성화면 규칙 기반 문장을 반환한다. (항상 문자열 반환 — 워커가 죽지 않도록)
    """
    fallback = _rule_based_reason(card_name, matched_category_names, annual_fee)

    if not settings.USE_LLM_REASON:
        return fallback

    try:
        return _truncate(_llm_reason(card_name, matched_category_names, annual_fee))
    except Exception as e:
        log.warning("LLM 사유 생성 실패, 규칙 기반으로 대체: %s", e)
        return fallback


def _llm_reason(
    card_name: str, matched: list[str], annual_fee: int | None
) -> str:
    cats = ", ".join(matched) if matched else "전반적인 생활"
    fee = f"{annual_fee:,}원" if annual_fee is not None else "정보 없음"
    user_prompt = (
        f"카드명: {card_name}\n"
        f"회원의 주요 소비 카테고리: {cats}\n"
        f"연회비: {fee}\n"
        "위 정보를 바탕으로 이 카드를 추천하는 사유를 한 문장으로 써줘."
    )
    with _llm_lock:
        resp = _ollama().chat(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            options={"temperature": 0.4},
        )
    content = (resp.get("message", {}) or {}).get("content", "").strip()
    if not content:
        raise ValueError("empty LLM response")
    # 혹시 여러 줄이면 첫 줄만.
    return content.splitlines()[0].strip().strip('"')


def _rule_based_reason(
    card_name: str, matched: list[str], annual_fee: int | None
) -> str:
    fee_part = (
        f" 연회비 {annual_fee:,}원으로 부담이 적습니다."
        if annual_fee is not None
        else ""
    )
    if matched:
        cats = "·".join(matched)
        return _truncate(
            f"{cats} 지출이 많은 회원님께 해당 영역 혜택이 있는 카드입니다.{fee_part}"
        )
    return _truncate(f"연회비 대비 혜택이 좋은 카드로 추천드립니다.{fee_part}")


def _truncate(text: str) -> str:
    return text if len(text) <= _MAX_REASON_LEN else text[: _MAX_REASON_LEN - 1] + "…"
