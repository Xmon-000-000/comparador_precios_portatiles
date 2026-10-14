#!/usr/bin/env python3

import json
import re
import difflib
import time

from pathlib import Path
from datetime import date

from playwright.sync_api import sync_playwright

CATALOGO = "data/catalogo.json"

GPU_SCORE = {
    "RTX 5060": 60,
    "RTX 5070": 85,
    "RTX 5080": 100
}

RAM_SCORE = {
    16: 10,
    24: 15,
    32: 20,
    64: 30
}


def normalize(text):

    text = text.upper()

    text = re.sub(
        r"[^A-Z0-9 ]",
        " ",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def similarity(a, b):

    return difflib.SequenceMatcher(
        None,
        normalize(a),
        normalize(b)
    ).ratio()


def extract_prices(text):

    raw_prices = re.findall(
        r"(\d{1,3}(?:\.\d{3})*,\d{2})",
        text
    )

    prices = []

    for p in raw_prices:
        try:

            value = float(
                p.replace(".", "")
                 .replace(",", ".")
            )

            if 500 <= value <= 5000:
                prices.append(value)

        except:
            pass

    return prices


def score_producto(product, precio):

    if not precio:
        return 0

    gpu_score = GPU_SCORE.get(
        product["gpu"],
        0
    )

    ram_score = RAM_SCORE.get(
        product["ram"],
        0
    )

    return round(
        (gpu_score + ram_score)
        / precio,
        5
    )


def amazon_search(page, product):

    query = product.get(
        "searchCode",
        product["searchTerms"]
    )

    url = (
        "https://www.amazon.es/s?k="
        + query.replace(" ", "+")
    )

    try:

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000
        )

        page.wait_for_timeout(3000)

        items = page.locator(
            "[data-component-type='s-search-result']"
        )

        best_score = 0
        best_price = None

        for i in range(
            min(items.count(), 10)
        ):

            item = items.nth(i)

            title_locator = item.locator("h2")

            if title_locator.count() == 0:
                continue

            title = title_locator.inner_text()

            score = similarity(
                product["searchTerms"],
                title
            )

            if score < 0.45:
                continue

            prices = extract_prices(
                item.inner_text()
            )

            if not prices:
                continue

            price = min(prices)

            if score > best_score:

                best_score = score
                best_price = price

        return {
            "url": page.url,
            "precio": best_price
        }

    except Exception as e:

        print(
            f"Amazon error {query}: {e}"
        )

        return {
            "url": url,
            "precio": None
        }


def pccomponentes_search(page, product):

    query = product.get(
        "searchCode",
        product["searchTerms"]
    )

    url = (
        "https://www.pccomponentes.com/buscar/?query="
        + query.replace(" ", "%20")
    )

    try:

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000
        )

        page.wait_for_timeout(5000)

        text = page.locator(
            "body"
        ).inner_text()

        if (
            "security verification"
            in text.lower()
        ):

            return {
                "url": url,
                "precio": None
            }

        prices = extract_prices(text)

        if not prices:

            return {
                "url": url,
                "precio": None
            }

        return {
            "url": url,
            "precio": min(prices)
        }

    except Exception:

        return {
            "url": url,
            "precio": None
        }


def guardar_historico(output):

    fecha = date.today().isoformat()

    Path(
        "data/precios"
    ).mkdir(
        parents=True,
        exist_ok=True
    )

    historico = (
        f"data/precios/{fecha}.json"
    )

    with open(
        historico,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )

    with open(
        "data/precios_hoy.json",
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )


def guardar_ranking(
    ranking
):

    ranking.sort(
        key=lambda x: x["valor_por_euro"],
        reverse=True
    )

    with open(
        "data/ranking_actual.json",
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            ranking,
            f,
            ensure_ascii=False,
            indent=2
        )


def main():

    with open(
        CATALOGO,
        encoding="utf-8"
    ) as f:

        catalog = json.load(f)

    resultados = []
    ranking = []

    productos = {
        p["model"]: p
        for p in catalog["products"]
    }

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=False
        )

        page = browser.new_page()

        for product in catalog["products"]:

            model = product["model"]

            print(
                f"Buscando {model}"
            )

            amazon = amazon_search(
                page,
                product
            )

            time.sleep(2)

            pc = pccomponentes_search(
                page,
                product
            )

            time.sleep(2)

            resultados.append({
                "portatil": model,
                "tienda": "Amazon",
                "url": amazon["url"],
                "precio_hoy": amazon["precio"]
            })

            resultados.append({
                "portatil": model,
                "tienda": "PcComponentes",
                "url": pc["url"],
                "precio_hoy": pc["precio"]
            })

            for tienda, data in [
                ("Amazon", amazon),
                ("PcComponentes", pc)
            ]:

                ranking.append({

                    "portatil": model,

                    "tienda": tienda,

                    "precio": data["precio"],

                    "valor_por_euro":
                        score_producto(
                            product,
                            data["precio"]
                        )
                })

        browser.close()

    output = {

        "fecha": str(date.today()),

       