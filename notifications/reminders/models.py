from django.conf import settings
from django.db import models


def default_reminder_channels():
    return ["in_app"]


class ReminderRule(models.Model):
    """Admin tanımlı hatırlatma kuralı (göreli katman).

    Koşullar AND ile birleşir; her offset ayrı bir hatırlatma üretir. Alıcı
    hedefleri kural oluşturulurken admin tarafından seçilir.
    """

    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    # Şablon ve gönderim tipi için bağlı bildirim kuralı (admin tarafından seçilir/oluşturulur).
    notification_rule = models.ForeignKey(
        "notifications.NotificationRule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminder_rules",
        verbose_name="Bildirim kuralı",
    )
    # Teslim kanalları (admin seçer): ["in_app"], ["email"] veya her ikisi.
    channels = models.JSONField(default=default_reminder_channels)
    # Alıcı hedefleri (admin seçer)
    notify_assigned_user = models.BooleanField(
        default=True, verbose_name="Atanmış kullanıcıya gönder"
    )
    notify_admins = models.BooleanField(
        default=False, verbose_name="Aktif adminlere gönder"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_reminder_rules",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Hatırlatma kuralı"
        verbose_name_plural = "Hatırlatma kuralları"

    def __str__(self) -> str:
        return str(self.name)


class ReminderCondition(models.Model):
    """Kural üzerinde tek bir alan/değer koşulu. Aynı kuraldaki koşullar AND'lenir."""

    rule = models.ForeignKey(
        ReminderRule,
        on_delete=models.CASCADE,
        related_name="conditions",
    )
    # Yalnızca Appointment.REMINDER_CONDITION_FIELDS beyaz listesindeki alanlar.
    field_name = models.CharField(max_length=50)
    # İlgili alanın choices değerlerinden biri.
    value = models.CharField(max_length=50)

    class Meta:
        verbose_name = "Koşul"
        verbose_name_plural = "Koşullar"

    def __str__(self) -> str:
        return f"{self.field_name} = {self.value}"


class ReminderOffset(models.Model):
    """Kurala bağlı zaman offseti. Her offset kendi hatırlatmasını üretir."""

    class Direction(models.TextChoices):
        BEFORE = "before", "Önce"
        AFTER = "after", "Sonra"

    rule = models.ForeignKey(
        ReminderRule,
        on_delete=models.CASCADE,
        related_name="offsets",
    )
    # Gün/saat/dakika tek alanda taşınır.
    duration = models.DurationField()
    direction = models.CharField(
        max_length=10,
        choices=Direction.choices,
        default=Direction.BEFORE,
    )

    class Meta:
        verbose_name = "Zaman offseti"
        verbose_name_plural = "Zaman offsetleri"

    def __str__(self) -> str:
        return f"{self.duration} {self.get_direction_display()}"


class ScheduledNotification(models.Model):
    """Bir kuralın bir randevuya uygulanmasıyla üretilen somut satır (mutlak katman).

    scheduled_at dondurulmuş mutlak bir zamandır; poller yalnızca bunu now() ile
    karşılaştırır, kural/offset değerlendirmesi yapmaz.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Beklemede"
        PROCESSING = "processing", "İşleniyor"
        SENT = "sent", "Gönderildi"
        CANCELLED = "cancelled", "İptal edildi"

    appointment = models.ForeignKey(
        "events.Appointment",
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    rule = models.ForeignKey(
        ReminderRule,
        on_delete=models.SET_NULL,
        related_name="scheduled_notifications",
        null=True,
        blank=True,
    )
    offset = models.ForeignKey(
        ReminderOffset,
        on_delete=models.SET_NULL,
        related_name="scheduled_notifications",
        null=True,
        blank=True,
    )
    scheduled_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_at"]
        verbose_name = "Zamanlanmış hatırlatma"
        verbose_name_plural = "Zamanlanmış hatırlatmalar"
        indexes = [
            # Dar aralık taraması için (status, scheduled_at) bileşik indeksi.
            models.Index(fields=("status", "scheduled_at")),
            # Retention cleanup sorguları için (status, updated_at) bileşik indeksi.
            models.Index(fields=("status", "updated_at"), name="sn_status_updated_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.appointment_id} @ {self.scheduled_at:%d-%m-%Y %H:%M} ({self.status})"
