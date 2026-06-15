from datetime import datetime


def parse_date(value):
    """다양한 형태의 날짜 문자열을 'YYYY-MM-DD' 로 정규화한다. 실패 시 None."""
    if not value:
        return None

    text = str(value).strip()
    formats = ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d", "%Y년 %m월 %d일", "%Y%m%d")
    for fmt in formats:
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None
