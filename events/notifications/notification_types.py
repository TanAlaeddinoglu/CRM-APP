from notifications.registry import registry


def _resolve_appointment_created(target, payload):
    actor = getattr(target, "created_by", None)
    if actor is None:
        return []
    if actor.is_admin():
        # Admin oluşturdu → müşteriye atanmış kullanıcıya bildir
        assigned = getattr(getattr(target, "customer", None), "assigned_to", None)
        return [assigned] if assigned is not None else []
    else:
        # Regular user oluşturdu → tüm aktif adminlere bildir
        from accounts.models import CustomUser

        return list(CustomUser.objects.filter(role="ADMIN", is_active=True))


def _resolve_appointment_status_updated(target, payload):
    # appointment_created ile aynı yönlendirme: admin güncellerse müşterinin
    # atanmış kullanıcısına, normal kullanıcı güncellerse adminlere.
    actor = getattr(target, "updated_by", None)
    if actor is None:
        return []
    if actor.is_admin():
        assigned = getattr(getattr(target, "customer", None), "assigned_to", None)
        return [assigned] if assigned is not None else []
    else:
        from notifications.utils import active_admins

        return active_admins()


# Randevu silindiğinde alıcılar signal içinde hesaplanıp açıkça verilir
# (target silindiği için resolver kullanılmaz).


registry.register(
    key="events.appointment_created",
    label="Randevu oluşturuldu",
    app_label="events",
    default_channels=["in_app"],
    default_title_template="Yeni randevu: {appointment_name}",
    default_body_template="{appointment_name} randevusu oluşturuldu.",
    recipient_resolver=_resolve_appointment_created,
    description=(
        "Bir randevu oluşturulduğunda tetiklenir. Admin oluşturursa müşterinin "
        "atanmış kullanıcısına, normal kullanıcı oluşturursa adminlere gider."
    ),
    variables=[
        {"key": "appointment_name", "label": "Randevu adı"},
        {"key": "customer_name", "label": "Müşteri tam adı"},
        {"key": "scheduled_for", "label": "Tarih/saat"},
        {"key": "actor_name", "label": "İşlemi yapan"},
    ],
)

registry.register(
    key="events.appointment_status_updated",
    label="Randevu durumu güncellendi",
    app_label="events",
    default_channels=["in_app"],
    default_title_template="Randevu durumu değişti: {appointment_name}",
    default_body_template="{appointment_name} randevusunun durumu {new_status} olarak güncellendi.",
    recipient_resolver=_resolve_appointment_status_updated,
    description=(
        "Randevu durumu değiştiğinde tetiklenir. Admin güncellerse müşterinin "
        "atanmış kullanıcısına, normal kullanıcı güncellerse adminlere gider."
    ),
    variables=[
        {"key": "appointment_name", "label": "Randevu adı"},
        {"key": "new_status", "label": "Yeni durum"},
        {"key": "old_status", "label": "Eski durum"},
        {"key": "customer_name", "label": "Müşteri tam adı"},
        {"key": "actor_name", "label": "İşlemi yapan"},
    ],
)

registry.register(
    key="events.appointment_deleted",
    label="Randevu silindi",
    app_label="events",
    default_channels=["in_app"],
    default_title_template="Randevu silindi: {appointment_name}",
    default_body_template="{appointment_name} randevusu silindi.",
    recipient_resolver=None,
    description=(
        "Bir randevu silindiğinde tetiklenir. Randevuyu admin oluşturduysa "
        "müşterinin atanmış kullanıcısına, normal kullanıcı oluşturduysa adminlere gider."
    ),
    variables=[
        {"key": "appointment_name", "label": "Randevu adı"},
        {"key": "customer_name", "label": "Müşteri tam adı"},
    ],
)
