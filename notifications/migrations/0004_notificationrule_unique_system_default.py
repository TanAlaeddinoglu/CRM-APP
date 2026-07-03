"""
Her bildirim tipi için yalnızca bir sistem varsayılan kuralı olmasını
veritabanı düzeyinde garanti eder.

Neden: AppConfig.ready() iki süreç tarafından (dev server reloader + worker)
neredeyse eş zamanlı çağrıldığında get_or_create yarış durumuna girer ve
aynı type_key için birden fazla is_system_default=True satırı oluşturulabilir.
UniqueConstraint ile Django'nun get_or_create IntegrityError'ı yakalaması sağlanır.

Adımlar:
  1. Veri migrasyonu — duplikatları temizle (fazladan satırı sil, bağlı bildirimleri
     hayatta kalan satıra yönlendir).
  2. Kısmi UNIQUE indeksi ekle.
"""

from django.db import migrations, models


def deduplicate_system_defaults(apps, schema_editor):
    """Her type_key için is_system_default=True olan satırlardan yalnızca en eskisini bırakır."""
    NotificationRule = apps.get_model("notifications", "NotificationRule")
    Notification = apps.get_model("notifications", "Notification")

    seen = {}
    for rule in NotificationRule.objects.filter(is_system_default=True).order_by("id"):
        if rule.type_key in seen:
            # Duplikat: bildirimleri hayatta kalan kurala taşı ve sil.
            survivor_id = seen[rule.type_key]
            Notification.objects.filter(rule_id=rule.id).update(rule_id=survivor_id)
            rule.delete()
        else:
            seen[rule.type_key] = rule.id


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("notifications", "0003_in_app_notifications")]

    operations = [
        migrations.RunPython(deduplicate_system_defaults, noop),
        migrations.AddConstraint(
            model_name="notificationrule",
            constraint=models.UniqueConstraint(
                fields=["type_key"],
                condition=models.Q(is_system_default=True),
                name="notifications_notificationrule_unique_system_default",
            ),
        ),
    ]
