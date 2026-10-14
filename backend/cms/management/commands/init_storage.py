"""Provision the public media bucket through S3, avoiding a separate mc image."""

import json
import os
import time
from urllib.error import URLError
from urllib.request import urlopen

import boto3
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Initialize the MinIO public media bucket; skip when S3 is not configured."

    def handle(self, *args, **options):
        endpoint = os.getenv("S3_ENDPOINT_URL")
        if not endpoint:
            self.stdout.write("Local file storage: no S3 initialization required")
            return
        for _ in range(30):
            try:
                with urlopen(endpoint + "/minio/health/ready", timeout=2) as response:
                    if response.status == 200:
                        break
            except (URLError, OSError):
                time.sleep(1)
        else:
            raise CommandError("MinIO did not become ready")
        bucket = os.getenv("S3_BUCKET", "terraklink")
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name="us-east-1",
            aws_access_key_id=os.environ["S3_ACCESS_KEY"],
            aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        )
        existing = {entry["Name"] for entry in client.list_buckets()["Buckets"]}
        if bucket not in existing:
            client.create_bucket(Bucket=bucket)
        # Public object reads only. Bucket listing and all mutations require credentials.
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"],
                }
            ],
        }
        client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
        self.stdout.write("Public media bucket initialized")
