#!/usr/bin/env python3
"""Daily price snapshot updater for the static comparison site.

The updater searches every catalog laptop on Amazon and PcComponentes,
normalizes the captured offers and refreshes data/precios.json,
data/historico.json and data/precios/<date>.json.
"""

from __future__ import annotations

import difflib
import json
import os
import re
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CATALOG_PATH = DATA_DIR / "catalogo.json"
PRECIOS_PATH = DATA_DIR / "precios.json"
HISTORICO_PATH = DATA_DIR / "historico.json"
HIST_DIR = DATA_DIR / "precios"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def normalize(text: Any) -> str:
    text = str(text).upper()
    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def similarity(a: Any, b: Any) -> float:
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def extract_prices(text: Any) -> List[float]:
    raw_prices = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", str(text))
    prices: List[float] = []
    for raw in raw_prices:
        try:
            value = float(raw.replace(".", "").replace(",", "."))
            if 500 <= value <= 2000:
                prices.append(value)
        except ValueError:
            pass
    return prices


def amazon_search(page: Any, product: Dict[str, Any]) -> Dict[str, Any]:
    query = product.get("searchCode") or product.get("searchTerms") or ""
    url = "https://www.amazon.es/s?k=" + quote_plus(str(query))
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        items = page.locator("[data-component-type='s-search-result']")
        best_score = 0.0
        best_price: float | None = None
        terms = product.get("searchTerms") or query
        for i in range(min(items.count(), 10)):
            item = items.nth(i)
            title_locator = item.locator("h2")
            if title_locator.count() == 0:
                continue
            title = title_locator.first.inner_text()
            score = similarity(terms, title)
            query_text = str(product.get("searchCode") or "")
            if score < 0.3 and query_text.lower() not in title.lower():
                continue
            prices = extract_prices(item.inner_text())
            if not prices:
                continue
            price = min(prices)
            if score > best_score:
                best_score = score
                best_price = price
        return {"url": url, "price": best_price}
    except Exception as exc:
        print(f"Amazon error {query}: {exc}")
        return {"url": url, "price": None}


def pccomponentes_search(page: Any, product: Dict[str, Any]) -> Dict[str, Any]:
    query = product.get("searchCode") or product.get("searchTerms") or ""
    url = "https://www.pccomponentes.com/buscar/?query=" + str(query).replace(" ", "%20")
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(5000)
        text = page.locator("body").inner_text()
        if "security verification" in text.lower():
            return {"url": url, "price": None}
        prices = extract_prices(text)
        if not prices:
            return {"url": url, "price": None}
        return {"url": url, "price": min(prices)}
    except Exception as exc:
        print(f"PcComponentes error {query}: {exc}")
        return {"url": url, "price": None}


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


def update_historico(historico: Dict[str, Any], product_id: str, price: float | None, today: str) -> None:
    models = historico.get("models")
    if not isinstance(models, list):
        raise ValueError("historico.json has an unexpected schema: missing models[]")

    by_id = {entry.get("id"): entry for entry in models if isinstance(entry, dict) and "id" in entry}
    product = by_id.get(product_id)
    if product is None:
        product = {"id": product_id, "prices": []}
        models.append(product)

    prices = product.setdefault("prices", [])
    if not isinstance(prices, list):
        raise ValueError(f"Price history for {product_id} is not a list")

    dates = historico.setdefault("dates", [])
    if today not in dates:
        dates.append(today)

    while len(prices) < len(dates):
        prices.append(None)
    if len(prices) > len(dates):
        del prices[len(dates):]

    index = dates.index(today)
    if price is None:
        prices[index] = None
    else:
        prices[index] = float(price)


def main() -> int:
    catalog = load_json(CATALOG_PATH)
    products = catalog.get("products", []) if isinstance(catalog, dict) else []

    unique: Dict[str, Dict[str, Any]] = {}
    for product in products:
        if not isinstance(product, dict) or "id" not in product:
            continue
        pid = str(product["id"])
        if pid not in unique or len(product) > len(unique[pid]):
            unique[pid] = product
    product_list = list(unique.values())

    precios = load_json(PRECIOS_PATH)
    historico = load_json(HISTORICO_PATH)

    precio_by_id = {entry.get("id"): entry for entry in precios.get("products", []) if isinstance(entry, dict)}
    for pid in unique:
        if pid not in precio_by_id:
            entry = {"id": pid, "updatedAt": None, "offers": {"amazon": None, "pccomponentes": None}}
            precios.setdefault("products", []).append(entry)
            precio_by_id[pid] = entry

    historico_by_id = {entry.get("id"): entry for entry in historico.get("models", []) if isinstance(entry, dict)}
    for pid in unique:
        if pid not in historico_by_id:
            entry = {"id": pid, "prices": []}
            historico.setdefault("models", []).append(entry)
            historico_by_id[pid] = entry

    today = date.today().isoformat()
    headless = bool(os.environ.get("DISPLAY") is None or os.environ.get("PLAYWRIGHT_HEADLESS", "").lower() in ("1", "true", "yes"))

    browser = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=headless)
            page = browser.new_page()
            for product in product_list:
                pid = str(product["id"])
                print(f"Buscando {product.get('model', pid)}")

                amazon_result = amazon_search(page, product)
                time.sleep(2)
                pc_result = pccomponentes_search(page, product)
                time.sleep(2)

                entry = precio_by_id[pid]
                offers = entry.setdefault("offers", {})
                offers.setdefault("amazon", None)
                offers.setdefault("pccomponentes", None)

                amazon_price = amazon_result.get("price")
                pc_price = pc_result.get("price")

                if amazon_price is not None:
                    offers["amazon"] = {
                        "price": float(amazon_price),
                        "url": amazon_result.get("url") or "",
                        "seller": "Amazon",
                        "updatedAt": today,
                    }
                    upsert_snapshot(
                        precios,
                        {
                            "productId": pid,
                            "store": "amazon",
                            "price": float(amazon_price),
                            "url": amazon_result.get("url") or "",
                            "seller": "Amazon",
                            "date": today,
                        },
                        today,
                    )

                if pc_price is not None:
                    offers["pccomponentes"] = {
                        "price": float(pc_price),
                        "url": pc_result.get("url") or "",
                        "seller": "PcComponentes",
                        "updatedAt": today,
                    }
                    upsert_snapshot(
                        precios,
                        {
                            "productId": pid,
                            "store": "pccomponentes",
                            "price": float(pc_price),
                            "url": pc_result.get("url") or "",
                            "seller": "PcComponentes",
                            "date": today,
                        },
                        today,
                    )

                # Updated date is today only when a capture succeeded; otherwise null.
                entry["updatedAt"] = today if (amazon_price is not None or pc_price is not None) else None

                historical_price = None
                found_prices = [value for value in (amazon_price, pc_price) if value is not None]
                if found_prices:
                    historical_price = min(found_prices)
                update_historico(historico, pid, historical_price, today)

            for pid in historico_by_id:
                if pid not in unique:
                    update_historico(historico, pid, None, today)

            if browser is not None:
                browser.close()
    except Exception as exc:
        print(f"Update failed: {exc}", file=sys.stderr)
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        return 1

    precios["captureDate"] = today
    precios["disclaimer"] = (
        f"Capturas actualizadas automáticamente el {today}. "
        "Los precios pueden cambiar; cada valor corresponde solo a la variante y vendedor identificados."
    )

    write_json(PRECIOS_PATH, precios)
    write_json(HISTORICO_PATH, historico)
    HIST_DIR.mkdir(parents=True, exist_ok=True)
    write_json(HIST_DIR / f"{today}.json", precios)
    print(f"Updated {len(product_list)} laptops for {today}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

