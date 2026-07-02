from __future__ import annotations

from bs4 import BeautifulSoup
from bs4.element import Tag

# 카드고릴라 상세페이지(reference/삼성 iD SELECT ALL 카드.html)에서 확인한 실제 DOM 기준.
# 여기서는 원시 문자열/리스트만 추출하고, 숫자화·구조화는 normalizer 가 담당한다.
#
# 확인된 구조:
#   .card_top .tit strong.card   → 카드명
#   .card_top .tit p.brand       → 발급사(카드사)
#   .card_top .card_img img      → 카드 이미지
#   .bnf2 .c_brand               → 카드 브랜드(Visa/Mastercard 등)
#   .bnf2 .in_out span           → 연회비(국내전용/해외겸용) + <b>금액</b>
#   .bnf1 > dl(.bnf11/12/13)     → 대표 혜택 요약 (dt=카테고리, dd strong=혜택, i=비고)
#   .benefit .bene_area dl       → 상세 혜택 블록 (dt=카테고리, dd=상세)


def parse_detail(html: str) -> dict:
    """상세페이지 HTML → 원시 dict.

    반환 키:
      card_name: str | None
      issuer: str | None
      card_network: str | None
      img_url: str | None
      annual_fee: {"domestic": str|None, "overseas": str|None}
      benefit_summary: list[{"title","value","note"}]
      benefit_details: list[{"title","desc"}]
    """
    soup = BeautifulSoup(html, "lxml")
    top = soup.select_one(".card_top")

    return {
        "card_name": _text(top, "strong.card") if top else None,
        "issuer": _text(top, "p.brand") if top else None,
        "card_network": _text(soup, ".bnf2 .c_brand"),
        "img_url": _img(top),
        "annual_fee": _annual_fee(soup),
        "benefit_summary": _benefit_summary(soup),
        "benefit_details": _benefit_details(soup),
    }


def _text(root: Tag | None, selector: str) -> str | None:
    if root is None:
        return None
    el = root.select_one(selector)
    if el is None:
        return None
    text = el.get_text(" ", strip=True)
    return text or None


def _img(top: Tag | None) -> str | None:
    if top is None:
        return None
    el = top.select_one(".card_img img")
    if el is None:
        return None
    src = el.get("src") or el.get("data-src")
    return src.strip() if src else None


def _annual_fee(soup: BeautifulSoup) -> dict:
    """.bnf2 .in_out 의 국내전용/해외겸용 연회비 금액 텍스트를 뽑는다.

    각 span 은 "국내전용 <b>20,000</b> 원" 형태. label 로 국내/해외를 구분한다.
    """
    domestic: str | None = None
    overseas: str | None = None
    for span in soup.select(".bnf2 .in_out span"):
        b = span.select_one("b")
        if b is None:
            continue
        amount = b.get_text(strip=True)
        label = span.get_text(" ", strip=True)
        if "국내" in label and domestic is None:
            domestic = amount
        elif "해외" in label and overseas is None:
            overseas = amount
    return {"domestic": domestic, "overseas": overseas}


def _benefit_summary(soup: BeautifulSoup) -> list[dict]:
    """.bnf1 의 대표 혜택 요약(보통 3개)을 구조화한다."""
    out: list[dict] = []
    for dl in soup.select(".bnf1 > dl"):
        title = _text(dl, "dt")
        value = _text(dl, "dd strong")
        note = _text(dl, "dd i")
        if title or value:
            out.append({"title": title, "value": value, "note": note})
    return out


def _benefit_details(soup: BeautifulSoup) -> list[dict]:
    """.benefit 영역의 상세 혜택 블록(카테고리별)을 뽑는다."""
    out: list[dict] = []
    for dl in soup.select(".benefit .bene_area dl"):
        title = _text(dl, "dt")
        desc = _text(dl, "dd")
        if title or desc:
            out.append({"title": title, "desc": desc})
    return out
