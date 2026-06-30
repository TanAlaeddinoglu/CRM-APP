from django.db import migrations, models
import django.db.models.deletion
import re
import unicodedata


def normalize_alias(value):
    s = str(value or "").strip()
    tr_map = str.maketrans(
        {
            "ı": "i",
            "İ": "i",
            "ş": "s",
            "Ş": "s",
            "ğ": "g",
            "Ğ": "g",
            "ü": "u",
            "Ü": "u",
            "ö": "o",
            "Ö": "o",
            "ç": "c",
            "Ç": "c",
        }
    )
    s = s.translate(tr_map)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def seed_product_aliases(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    ProductAlias = apps.get_model("products", "ProductAlias")

    alias_map = {
        "kalınlaştırma": [
            "penis kalınlaştırma",
            "penis_kalınlastırma",
            "penis kalinlastirma",
            "kalınlastırma",
            "kalinlastirma",
            "penis kalinlastirma",
        ],
        "erken boşalma": [
            "erken_boşalma",
            "erken bosalma",
            "erken-bosalma",
            "erken boşalma",
        ],
        "sertleşme": [
            "sertlesme",
            "sertleşme",
            "sertlesme sorunu",
        ],
    }

    for product_name, aliases in alias_map.items():
        product = Product.objects.filter(name__iexact=product_name).first()
        if product is None:
            continue
        for alias in aliases:
            normalized = normalize_alias(alias)
            if not normalized:
                continue
            ProductAlias.objects.get_or_create(
                alias_normalized=normalized,
                defaults={"product": product, "alias": alias},
            )


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_product_slug"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductAlias",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("alias", models.CharField(max_length=120, unique=True)),
                (
                    "alias_normalized",
                    models.CharField(editable=False, max_length=120, unique=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aliases",
                        to="products.product",
                    ),
                ),
            ],
            options={
                "ordering": ("alias",),
            },
        ),
        migrations.AddIndex(
            model_name="productalias",
            index=models.Index(
                fields=["alias_normalized"],
                name="products_pr_alias__0e52e0_idx",
            ),
        ),
        migrations.RunPython(seed_product_aliases, migrations.RunPython.noop),
    ]
