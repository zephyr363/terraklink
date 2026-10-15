"""Read-only smoke check of the actual Nginx/HTML/assets boundary after a build."""

import argparse
import json
from html.parser import HTMLParser
from urllib.error import HTTPError
from urllib.request import urlopen


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.styles = []
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs["href"])
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property"))] = attrs.get("content")


def check(origin):
    def get(path):
        with urlopen(origin.rstrip("/") + path, timeout=20) as response:
            assert response.status == 200, path
            return response.read().decode(), response.headers

    content = json.loads(get("/api/content/")[0])["document"]
    item = next(
        item
        for section in content["sections"]
        if section["type"] == "catalog" and section["visible"]
        for item in section["items"]
    )
    for path in ("/", "/catalog", "/catalog/" + item["id"], "/contacts", "/?lang=kk"):
        html, headers = get(path)
        head = Head()
        head.feed(html)
        assert head.meta.get("description") is not None, path
        assert "site-schema" in html and 'rel="canonical"' in html, path
        assert "X-Robots-Tag" in headers, path
        assert headers.get("Content-Security-Policy"), path
        assert head.scripts == ["/assets/app.js"], path
        assert head.styles == ["/assets/app.css"], path
        for asset in head.scripts + head.styles:
            _, asset_headers = get(asset)
            assert "no-cache" in asset_headers.get("Cache-Control", ""), asset
            assert asset_headers.get("X-Content-Type-Options") == "nosniff", asset
    for path in ("/admin", "/admin/", "/admin/settings"):
        html, headers = get(path)
        head = Head()
        head.feed(html)
        assert "noindex" in head.meta.get("robots", ""), path
        assert headers.get("Content-Security-Policy"), path
    for path in ("/robots.txt", "/sitemap.xml", "/llms.txt"):
        get(path)
    try:
        get("/this-page-does-not-exist")
    except HTTPError as error:
        assert error.code == 404
    else:
        raise AssertionError("Unknown public pages must return HTTP 404")
    print(
        "PASS: Nginx public HTML, product routes, RU/KZ, metadata, assets/cache/CSP, admin HTTP 200/noindex, discovery and HTTP 404"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost")
    check(parser.parse_args().url)
