from urllib.parse import urlparse, unquote

import boto3

from app.config import settings

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
    return _s3


def _to_key(file_url: str) -> str:
    """document_files.file_url 은 S3 object key 또는 전체 URL 일 수 있다.

    API 서버는 보통 `https://{bucket}.s3.{region}.amazonaws.com/{key}` 또는
    CloudFront URL 을 저장하므로 둘 다 key 로 정규화한다.
    """
    if file_url.startswith("http://") or file_url.startswith("https://"):
        path = urlparse(file_url).path.lstrip("/")
        return unquote(path)
    return file_url


def download_object(file_url: str) -> bytes:
    """S3 에서 객체를 내려받아 bytes 로 반환한다."""
    key = _to_key(file_url)
    resp = _client().get_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
    return resp["Body"].read()
