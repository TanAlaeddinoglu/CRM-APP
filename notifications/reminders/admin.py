from django import forms
from django.contrib import admin

from .models import (
    ReminderCondition,
    ReminderOffset,
    ReminderRule,
    ScheduledNotification,
)
from .services import allowed_condition_fields


def _field_choices():
    return [("", "---------")] + [
        (f["name"], f["label"]) for f in allowed_condition_fields()
    ]


def _value_lookup():
    """{field_name: {value: label}} — sunucu tarafı doğrulama için."""
    return {
        f["name"]: {c["value"]: c["label"] for c in f["choices"]}
        for f in allowed_condition_fields()
    }


class ReminderConditionForm(forms.ModelForm):
    field_name = forms.ChoiceField(choices=_field_choices, label="Alan")
    # Değer, izin verilen alanın choices'ından seçilir; seçenekler JS ile doldurulur.
    value = forms.CharField(widget=forms.Select(choices=[]), label="Değer")

    class Meta:
        model = ReminderCondition
        fields = ("field_name", "value")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Kayıtlı değeri kaybetmemek için mevcut seçeneği başlangıçta ekle (JS yeniler).
        current = self.initial.get("value") or getattr(self.instance, "value", "")
        if current:
            self.fields["value"].widget.choices = [(current, current)]

    def clean(self):
        cleaned = super().clean()
        field_name = cleaned.get("field_name")
        value = cleaned.get("value")
        if field_name and value:
            lookup = _value_lookup()
            if field_name not in lookup:
                self.add_error("field_name", "İzin verilmeyen alan.")
            elif value not in lookup[field_name]:
                self.add_error("value", "Bu alan için geçerli bir değer seçin.")
        return cleaned


class ReminderConditionInline(admin.TabularInline):
    model = ReminderCondition
    form = ReminderConditionForm
    extra = 0
    verbose_name = "Koşul (AND)"
    verbose_name_plural = "Koşullar (tümü AND ile birleşir)"


class ReminderOffsetInline(admin.TabularInline):
    model = ReminderOffset
    extra = 1
    verbose_name = "Zaman offseti"
    verbose_name_plural = "Zaman offsetleri (her biri ayrı hatırlatma üretir)"


@admin.register(ReminderRule)
class ReminderRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "notify_assigned_user", "notify_admins")
    list_filter = ("is_active", "notify_assigned_user", "notify_admins")
    search_fields = ("name",)
    inlines = (ReminderConditionInline, ReminderOffsetInline)
    fieldsets = (
        (None, {"fields": ("name", "is_active", "notification_rule", "channels")}),
        (
            "Alıcılar",
            {
                "fields": ("notify_assigned_user", "notify_admins"),
                "description": "Bu kural eşleştiğinde hatırlatma kimlere gönderilsin?",
            },
        ),
    )

    class Media:
        css = {"all": ("reminders/admin/condition_builder.css",)}
        js = ("reminders/admin/condition_builder.js",)

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def _extra_context(self, extra_context):
        extra_context = extra_context or {}
        extra_context["reminder_allowed_fields"] = allowed_condition_fields()
        return extra_context

    def add_view(self, request, form_url="", extra_context=None):
        return super().add_view(request, form_url, self._extra_context(extra_context))

    def change_view(self, request, object_id, form_url="", extra_context=None):
        return super().change_view(
            request, object_id, form_url, self._extra_context(extra_context)
        )


@admin.register(ScheduledNotification)
class ScheduledNotificationAdmin(admin.ModelAdmin):
    """Üretilen mutlak satırlar — gözlemlenebilirlik için salt-okunur liste."""

    list_display = ("appointment", "rule", "scheduled_at", "status", "sent_at")
    list_filter = ("status",)
    date_hierarchy = "scheduled_at"
    raw_id_fields = ("appointment", "rule", "offset")
    readonly_fields = (
        "appointment",
        "rule",
        "offset",
        "scheduled_at",
        "status",
        "created_at",
        "updated_at",
        "sent_at",
    )

    def has_add_permission(self, request):
        return False
