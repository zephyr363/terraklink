"""One-time local reference assets. No production hotlinks or third-party tracking."""
import concurrent.futures
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
ASSETS = {
    "hero-family.png": "/upload/iblock/9aa/8u22s8j5dpgy935nxav7ydzmdw8y5mq5.png",
    "banner.jpg": "/upload/iblock/bbe/z3gbzzkcy217jbslwjy6sdkithxvgfwf.jpg",
    "product-1.jpg": "/upload/resize_cache/iblock/780/191_163_1/h2bk1i1h0mfyyy205yaw85fn9s803906.jpg",
    "product-2.jpg": "/upload/resize_cache/iblock/ae3/191_163_1/hrgypq3by18rey6kaguovah3qf8ord6t.jpg",
    "product-3.jpg": "/upload/resize_cache/iblock/a97/191_163_1/dm4xuymzwntjgg7q1awsitmi63n4axzh.jpg",
    "product-4.jpg": "/upload/resize_cache/iblock/5c0/191_163_1/glfbc6qr3e2sbfpx1mz3bby3fj5ooras.jpg",
    "product-5.jpg": "/upload/resize_cache/iblock/25a/191_163_1/nir416xubv1b39sf86902z6bosubmeb6.jpg",
    "product-6.jpg": "/upload/resize_cache/iblock/fff/191_163_1/sm54u9w4umze7dheq2lfi879cfae8l8h.jpg",
    "project-1.jpg": "/upload/resize_cache/iblock/9b5/700_700_0/8qxlosi6j5h96eo8hitu3g4b593x9bgo.jpg",
    "project-2.jpg": "/upload/resize_cache/iblock/90c/1000_1000_0/sek9xpenco1n9iw5lpy381q7rw1dofaf.jpg",
    "project-3.jpg": "/upload/iblock/8f3/5eh9pgym9kgv4pdkvlkv1lf1osx2fu7v.jpg",
    "project-4.jpg": "/upload/iblock/a48/nnku0jkky5fnkijmnc7qegzbui2us7ng.jpeg",
    "about.jpg": "/upload/iblock/c08/c0823afd11831768644e50f45e45b584.jpg",
    "feature-1.png": "/upload/resize_cache/iblock/489/61_60_0/489200c86ffaf45849aed24fb402fcbd.png",
    "feature-2.png": "/upload/resize_cache/iblock/33d/61_60_0/33dcfb801c5c9d51e802766cae55fa27.png",
    "feature-3.png": "/upload/resize_cache/iblock/996/61_60_0/99631be859d8fae52dd1bab2416ad5b8.png",
    "feature-4.png": "/upload/resize_cache/iblock/768/61_60_0/768c8954bde5bb7275c3e761b15a8b33.png",
}


def download(asset):
    name, path = asset
    target = ROOT / "frontend/public/assets" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with urlopen("https://likolorpro.ru" + path, timeout=45) as response:
            target.write_bytes(response.read())
    return {"file": name, "source": "https://likolorpro.ru" + path}


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        manifest = list(pool.map(download, ASSETS.items()))
    (ROOT / "docs").mkdir(exist_ok=True)
    (ROOT / "docs/reference-assets.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Prepared {len(manifest)} reference assets for design review")
