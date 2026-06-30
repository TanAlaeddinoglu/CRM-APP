from __future__ import annotations

from django.conf import settings
from django.template.loader import render_to_string


def render_email_html(*, title, body, cta_url=None, cta_label=None) -> str:
    """Giden e-postalar için markalı HTML gövdeyi üretir (düz metin fallback'in alternatifi)."""
    return str(
        render_to_string(
            "notifications/email/base.html",
            {
                "brand": getattr(settings, "MAIL_BRAND_NAME", "CRM"),
                "title": title,
                "body": body,
                "cta_url": cta_url,
                "cta_label": cta_label or "Görüntüle",
            },
        )
    )
