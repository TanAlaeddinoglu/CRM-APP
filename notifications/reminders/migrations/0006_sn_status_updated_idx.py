from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reminders", "0005_reminderrule_notification_rule"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="schedulednotification",
            index=models.Index(
                fields=["status", "updated_at"],
                name="sn_status_updated_idx",
            ),
        ),
    ]
