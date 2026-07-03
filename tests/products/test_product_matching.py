import pytest

from products.models import Product, ProductAlias
from products.product_matching import resolve_products_from_text

pytestmark = pytest.mark.django_db


def test_product_matching_resolves_name_slug_and_alias_variants():
    kalinlastirma = Product.objects.create(name="kalınlaştırma")
    ProductAlias.objects.create(
        product=kalinlastirma,
        alias="penis kalinlastirma",
    )
    erken_bosalma = Product.objects.create(name="erken boşalma")

    result = resolve_products_from_text(
        "penis_kalınlastırma, erken-bosalma, bilinmeyen ürün"
    )

    assert [product.name for product in result.products] == [
        "kalınlaştırma",
        "erken boşalma",
    ]
    assert result.unmatched == ["bilinmeyen ürün"]


def test_product_matching_deduplicates_same_product_matches():
    product = Product.objects.create(name="sertleşme")
    ProductAlias.objects.create(product=product, alias="sertlesme sorunu")

    result = resolve_products_from_text("sertleşme, sertlesme sorunu")

    assert result.products == [product]
    assert result.unmatched == []
