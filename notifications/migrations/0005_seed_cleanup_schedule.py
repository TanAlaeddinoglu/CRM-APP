from django.db import migrations

CLEANUP_TASK_NAME = "notifications.cleanup_expired_data"
CLEANUP_TASK_PATH = "notifications.tasks.cleanup_expired_data"


def seed_schedule(apps, schema_editor):
    CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    crontab, _ = CrontabSchedule.objects.get_or_create(
        minute="0",
        hour="3",
        day_of_week="*",
        day_of_month="*",
        month_of_year="*",
        timezone="Europe/Istanbul",
    )
    PeriodicTask.objects.get_or_create(
        name=CLEANUP_TASK_NAME,
        defaults={
            "task": CLEANUP_TASK_PATH,
            "crontab": crontab,
            "enabled": True,
        },
    )


def remove_schedule(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name=CLEANUP_TASK_NAME).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0004_notificationrule_unique_system_default"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(seed_schedule, reverse_code=remove_schedule),
    ]
