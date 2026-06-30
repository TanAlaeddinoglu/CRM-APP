from __future__ import annotations

import re
from dataclasses import dataclass

from products.models import Product, ProductAlias, normalize_product_lookup_text


@dataclass
class ProductMatchResult:
    products: list
    unmatched: list[str]


def split_product_text(raw: str) -> list[str]:
    text = str(raw or "").strip()
    if not text:
        return []
    parts = re.split(r"[|,;]+", text)
    return [part.strip() for part in parts if part and part.strip()]


def resolve_products_from_text(raw: str) -> ProductMatchResult:
    tokens = split_product_text(raw)
    if not tokens:
        return ProductMatchResult(products=[], unmatched=[])

    products = list(Product.objects.all().only("id", "name", "slug"))
    products_by_id = {product.id: product for product in products}
    aliases = list(ProductAlias.objects.all().only("alias_normalized", "product_id"))

    by_key = {}
    for product in products:
        for value in (product.slug, product.name):
            key = normalize_product_lookup_text(value)
            if key:
                by_key.setdefault(key, product)

    for alias in aliases:
        product = products_by_id.get(alias.product_id)
        if alias.alias_normalized and product is not None:
            by_key.setdefault(alias.alias_normalized, product)

    resolved = []
    unmatched = []
    seen_ids = set()
    product_keys = [
        (normalize_product_lookup_text(product.slug), product)
        for product in products
        if normalize_product_lookup_text(product.slug)
    ] + [
        (normalize_product_lookup_text(product.name), product)
        for product in products
        if normalize_product_lookup_text(product.name)
    ]

    for token in tokens:
        key = normalize_product_lookup_text(token)
        if not key:
            continue

        product = by_key.get(key)

        if product is None:
            key_without_penis = re.sub(r"\bpenis\b", "", key).strip()
            key_without_penis = re.sub(r"\s+", " ", key_without_penis)
            if key_without_penis and key_without_penis != key:
                product = by_key.get(key_without_penis)

        if product is None:
            product = _contains_match(key, product_keys)

        if product is None:
            unmatched.append(token)
            continue

        if product.id not in seen_ids:
            resolved.append(product)
            seen_ids.add(product.id)

    return ProductMatchResult(products=resolved, unmatched=unmatched)


def _contains_match(key: str, product_keys: list[tuple[str, Product]]):
    for product_key, product in product_keys:
        if not product_key:
            continue
        if product_key in key or key in product_key:
            return product
    compact_key = key.replace(" ", "")
    for product_key, product in product_keys:
        compact_product_key = product_key.replace(" ", "")
        if compact_product_key and (compact_product_key in compact_key or compact_key in compact_product_key):
            return product
    return None
