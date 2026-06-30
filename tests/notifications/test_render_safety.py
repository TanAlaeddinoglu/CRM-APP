"""Şablon render'ının güvenli ve sağlam olduğunu doğrular."""
from notifications.services.dispatcher import NotificationDispatchService


def _render(template, payload):
    return NotificationDispatchService()._render(template, payload)


def test_known_token_is_substituted():
    assert _render("Yeni: {appointment_name}", {"appointment_name": "Muayene"}) == (
        "Yeni: Muayene"
    )


def test_missing_token_becomes_empty():
    assert _render("Merhaba {missing}!", {}) == "Merhaba !"


def test_attribute_access_is_not_evaluated():
    # str.format olsaydı bu sınıf/globals sızdırabilirdi; güvenli render literal bırakır.
    out = _render("{x.__class__}", {"x": "val"})
    assert "__class__" in out  # token literal kaldı, exploit yok
    assert "class '" not in out


def test_positional_tokens_become_empty_not_exploitable():
    # Pozisyonel/sayısal tokenlar payload'da yok → boş; exploit yok.
    assert _render("{0} {1}", {}) == " "


def test_format_spec_is_left_literal():
    # ':' içeren format-spec'ler {kelime} desenine uymaz → literal kalır.
    assert _render("{name:>10}", {"name": "a"}) == "{name:>10}"


def test_none_template_is_safe():
    assert _render(None, {"a": 1}) == ""
