from notifications.registry import registry

# Alıcılar her zaman poller tarafından açıkça verilir (kural bayraklarına göre),
# bu yüzden statik recipient_resolver yoktur.
registry.register(
    key="reminders.appointment_reminder",
    label="Randevu hatırlatması",
    app_label="reminders",
    default_channels=["in_app"],
    default_title_template="Hatırlatma: {appointment_name}",
    default_body_template="{appointment_name} — randevunuza {time_phrase}.",
    recipient_resolver=None,
    description=(
        "Hatırlatma kuralı eşleşen bir randevu için zamanı geldiğinde tetiklenir. "
        "Mesaj, gönderim anındaki gerçek kalan süreyi içerir."
    ),
    variables=[
        {"key": "appointment_name", "label": "Randevu adı"},
        {"key": "time_phrase", "label": "Kalan süre ifadesi"},
        {"key": "customer_name", "label": "Müşteri tam adı"},
        {"key": "scheduled_for", "label": "Randevu tarihi/saati"},
    ],
    category="reminder",
)
