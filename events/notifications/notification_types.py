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
    creator = getattr(target, "created_by", None)
    return [creator] if creator is not None else []


registry.register(
    key="events.appointment_created",
    label="Randevu oluşturuldu",
    app_label="events",
    default_channels=["in_app"],
    default_title_template="Yeni randevu: {appointment_name}",
    default_body_template="{appointment_name} randevusu oluşturuldu.",
    recipient_resolver=_resolve_appointment_created,
)

registry.register(
    key="events.appointment_status_updated",
    label="Randevu durumu güncellendi",
    app_label="events",
    default_channels=["in_app"],
    default_title_template="Randevu durumu değişti: {appointment_name}",
    default_body_template="{appointment_name} randevusunun durumu {new_status} olarak güncellendi.",
    recipient_resolver=_resolve_appointment_status_updated,
)
