import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reminders", "0004_reminderrule_type_key"),
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="reminderrule",
            name="type_key",
        ),
        migrations.AddField(
            model_name="reminderrule",
            name="notification_rule",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reminder_rules",
                to="notifications.notificationrule",
                verbose_name="Bildirim kuralı",
            ),
        ),
    ]
