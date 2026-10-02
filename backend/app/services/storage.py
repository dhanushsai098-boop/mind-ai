import uuid
from datetime import timedelta

import boto3
from botocore.client import Config as BotoConfig

from app.core.config import get_settings

settings = get_settings()

_client = None


def get_r2_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=BotoConfig(signature_version="s3v4", s3={"addressing_style": "path"}),
            region_name="auto",
        )
    return _client


def build_storage_key(workspace_id: str, filename: str) -> str:
    safe_name = filename.replace("/", "_")
    return f"workspaces/{workspace_id}/{uuid.uuid4()}_{safe_name}"


def presign_put(storage_key: str, content_type: str, expires_seconds: int = 900) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": storage_key, "ContentType": content_type},
        ExpiresIn=expires_seconds,
    )


def presign_get(storage_key: str, expires_seconds: int = 900, download_name: str | None = None) -> str:
    client = get_r2_client()
    params = {"Bucket": settings.r2_bucket_name, "Key": storage_key}
    if download_name:
        params["ResponseContentDisposition"] = f'attachment; filename="{download_name}"'
    return client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_seconds)


def delete_object(storage_key: str) -> None:
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=storage_key)


def copy_object(src_key: str, dst_key: str) -> None:
    client = get_r2_client()
    client.copy_object(
        Bucket=settings.r2_bucket_name,
        CopySource={"Bucket": settings.r2_bucket_name, "Key": src_key},
        Key=dst_key,
    )
