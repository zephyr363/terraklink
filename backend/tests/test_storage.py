import json
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError


def configure(monkeypatch):
    for key, value in {
        "S3_ENDPOINT_URL": "http://minio:9000",
        "S3_ACCESS_KEY": "test-key",
        "S3_SECRET_KEY": "test-secret",
        "S3_BUCKET": "test-bucket",
    }.items():
        monkeypatch.setenv(key, value)


@pytest.mark.parametrize("exists", [True, False])
def test_init_storage_idempotent_and_only_allows_public_object_reads(monkeypatch, exists):
    configure(monkeypatch)
    client = MagicMock()
    client.list_buckets.return_value = {"Buckets": [{"Name": "test-bucket"}] if exists else []}
    response = MagicMock()
    response.__enter__.return_value.status = 200
    with (
        patch("cms.management.commands.init_storage.urlopen", return_value=response),
        patch("cms.management.commands.init_storage.boto3.client", return_value=client),
    ):
        call_command("init_storage")
    assert client.create_bucket.call_count == (0 if exists else 1)
    policy = json.loads(client.put_bucket_policy.call_args.kwargs["Policy"])
    assert policy["Statement"][0]["Action"] == ["s3:GetObject"]
    assert policy["Statement"][0]["Resource"] == ["arn:aws:s3:::test-bucket/*"]


def test_init_storage_stops_on_readiness_failure(monkeypatch):
    configure(monkeypatch)
    with (
        patch("cms.management.commands.init_storage.urlopen", side_effect=OSError),
        patch("cms.management.commands.init_storage.time.sleep"),
        patch("cms.management.commands.init_storage.boto3.client") as client,
    ):
        with pytest.raises(CommandError):
            call_command("init_storage")
        client.assert_not_called()


def test_init_storage_skips_local_storage(monkeypatch):
    monkeypatch.delenv("S3_ENDPOINT_URL", raising=False)
    with patch("cms.management.commands.init_storage.boto3.client") as client:
        call_command("init_storage")
        client.assert_not_called()
