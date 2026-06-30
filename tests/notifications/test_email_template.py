"""Giden e-postaların markalı HTML şablonla (multipart) gittiğini doğrular."""
import pytest
from django.core import mail

from notifications.mail.services import send_email_notification
from notifications.mail.templating import render_email_html


pytestmark = pytest.mark.django_db


def test_render_email_html_contains_brand_title_body():
    html = render_email_html(title="Yeni müşteri", body="Ahmet oluşturuldu.")
    assert "Yeni müşteri" in html
    assert "Ahmet oluşturuldu." in html
    assert "Melagrana" in html  # MAIL_BRAND_NAME configured value


def test_render_email_html_cta_optional():
    assert "href" not in render_email_html(title="T", body="B")
    with_cta = render_email_html(
        title="T", body="B", cta_url="https://x/customers/5", cta_label="Görüntüle"
    )
    assert "https://x/customers/5" in with_cta
    assert "Görüntüle" in with_cta


def test_sent_email_has_html_alternative(active_mail_configuration):
    send_email_notification(
        subject="Yeni randevu: Test",
        body="Test randevusu oluşturuldu.",
        to_emails=["alici@example.com"],
    )

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    # Düz metin gövde fallback olarak korunur
    assert message.body == "Test randevusu oluşturuldu."
    # HTML alternatif eklenmiş olmalı
    assert len(message.alternatives) == 1
    html, mimetype = message.alternatives[0]
    assert mimetype == "text/html"
    assert "Yeni randevu: Test" in html
    assert "Test randevusu oluşturuldu." in html
    assert "Melagrana" in html


def test_html_escapes_body(active_mail_configuration):
    send_email_notification(
        subject="Konu",
        body="<script>alert(1)</script>",
        to_emails=["alici@example.com"],
    )
    html = mail.outbox[0].alternatives[0][0]
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html
