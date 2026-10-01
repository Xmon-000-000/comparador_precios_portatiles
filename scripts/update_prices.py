#!/usr/bin/env python3
"""Daily price snapshot updater for the static comparison site.

This script keeps the project static-friendly: it does not run as a web service.
It simply updates the JSON files if a source feed is defined via environment
variables or a local file.

Expected feed shape (examples):
  {
    "date": "2026-10-01",
    "offers": [
      {"productId": "asus-tuf-fa608um-rv005-5060-32-1tb", "store": "amazon", "price": 1499, "url": "...", "seller": "Amazon"},
      {"productId": "asus-tuf-fa608um-rv005-5060-32-1tb", "store": "pccomponentes", "price": 1399, "url": "...", "seller": "PcComponentes"}
    ]
  }

or a plain list of offer objects.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List
from urllib import request

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CATALOG_PATH = DATA_DIR / "catalogo.json"
PRECIOS_PATH = DATA_DIR / "precios.json"
HISTORICO_PATH = DATA_DIR / "historico.json"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def resolve_feed_source() -> str | None:
    feed_url = os.environ.get("PRICE_FEED_URL")
    if feed_url:
        return feed_url

    feed_path = os.environ.get("PRICE_FEED_PATH")
    if feed_path:
        return feed_path

    default_path = ROOT / "data" / "price-feed.json"
    return str(default_path) if default_path.exists() else None


def fetch_json(source: str) -> Any:
    lower = source.lower()
    if lower.startswith("http://") or lower.startswith("https://"):
        with request.urlopen(source, timeout=30) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            payload = response.read().decode(charset)
        return json.loads(payload)

    return load_json(Path(source))


def normalize_store(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    mapping = {
        "amazon": "amazon",
        "amzn": "amazon",
        "pccomponentes": "pccomponentes",
        "pc": "pccomponentes",
        "pc_componentes": "pccomponentes",
    }
    return mapping.get(normalized, normalized)


def extract_offers(feed: Any) -> List[Dict[str, Any]]:
    if isinstance(feed, dict):
        if "offers" in feed and isinstance(feed["offers"], list):
            return feed["offers"]
        if "data" in feed and isinstance(feed["data"], list):
            return feed["data"]
        if "products" in feed and isinstance(feed["products"], list):
            return feed["products"]
        if "offers" in feed and isinstance(feed["offers"], dict):
            out: List[Dict[str, Any]] = []
            for product_id, stores in feed["offers"].items():
                if isinstance(stores, dict):
                    for store_name, offer in stores.items():
                        if isinstance(offer, dict):
                            offer = dict(offer)
                            offer["productId"] = product_id
                            offer["store"] = store_name
                            out.append(offer)
            return out
        if "items" in feed and isinstance(feed["items"], list):
            return feed["items"]
        return []

    if isinstance(feed, list):
        return feed

    return []


def normalize_offer(item: Dict[str, Any]) -> Dict[str, Any]:
    product_id = item.get("productId") or item.get("id") or item.get("product_id")
    if not product_id:
        raise ValueError(f"Offer without productId/id: {item!r}")

    store = normalize_store(item.get("store") or item.get("shop") or item.get("retailer"))
    if store is None:
        raise ValueError(f"Offer missing store for product {product_id}: {item!r}")

    price = item.get("price")
    if price is None:
        raise ValueError(f"Offer missing price for product {product_id}")

    return {
        "productId": str(product_id),
        "store": store,
        "price": float(price),
        "url": item.get("url") or "",
        "seller": item.get("seller") or item.get("merchant") or store,
        "date": item.get("date") or date.today().isoformat(),
    }


def upsert_snapshot(precios: Dict[str, Any], offer: Dict[str, Any], today: str) -> None:
    products = precios.get("products")
    if not isinstance(products, list):
        raise ValueError("precios.json has an unexpected schema: missing products[]")

    by_id = {entry.get("id"): entry for entry in products if isinstance(entry, dict) and "id" in entry}
    product = by_id.get(offer["productId"])
    if product is None:
        raise ValueError(f"Unknown product id in feed: {offer['productId']}")

    offers = product.setdefault("offers", {})
    offers[offer["store"]] = {
        "price": offer["price"],
        "url": offer["url"],
        "seller": offer["seller"],
        "updatedAt": offer["date"],
    }

    product["updatedAt"] = today
    precios["captureDate"] = today
    precios["disclaimer"] = (
        f"Capturas actualizadas automáticamente el {today}. "
        "Los precios pueden cambiar; cada valor corresponde solo a la variante y vendedor identificados."
    )


def update_historico(historico: Dict[str, Any], offer: Dict[str, Any], today: str) -> None:
    models = historico.get("models")
    if not isinstance(models, list):
        raise ValueError("historico.json has an unexpected schema: missing models[]")

    by_id = {entry.get("id"): entry for entry in models if isinstance(entry, dict) and "id" in entry}
    product = by_id.get(offer["productId"])
    if product is None:
        raise ValueError(f"Unknown product id in history: {offer['productId']}")

    prices = product.setdefault("prices", [])
    if not isinstance(prices, list):
        raise ValueError(f"Price history for {offer['productId']} is not a list")

    price_value = float(offer["price"])
    if not prices or abs(float(prices[-1]) - price_value) > 0.0001:
        prices.append(price_value)

    dates = historico.setdefault("dates", [])
    if today not in dates:
        dates.append(today)


def main() -> int:
    source = resolve_feed_source()
    if not source:
        print("No PRICE_FEED_URL / PRICE_FEED_PATH configured. Nothing to update.")
        return 0

    try:
        feed = fetch_json(source)
    except Exception as exc:  # pragma: no cover - explicit workflow safety
        print(f"Unable to fetch feed from {source}: {exc}", file=sys.stderr)
        return 1

    today = date.today().isoformat()

    try:
        offers = extract_offers(feed)
        if not offers:
            print("Feed loaded successfully but no offers were found.")
            return 0

        precios = load_json(PRECIOS_PATH)
        historico = load_json(HISTORICO_PATH)

        normalized = [normalize_offer(item) for item in offers]
        for offer in normalized:
            upsert_snapshot(precios, offer, today)
            update_historico(historico, offer, today)

        write_json(PRECIOS_PATH, precios)
        write_json(HISTORICO_PATH, historico)
        print(f"Updated {len(normalized)} offers for {today}.")
        return 0
    except Exception as exc:  # pragma: no cover - explicit workflow safety
        print(f"Update failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
