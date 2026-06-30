from django.db import migrations

POLLER_TASK_NAME = "reminders.poll_due_reminders"
POLLER_TASK_PATH = "notifications.reminders.tasks.poll_due_reminders"


def seed_schedule(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    interval, _ = IntervalSchedule.objects.get_or_create(
        every=1,
        period="minutes",
    )
    PeriodicTask.objects.get_or_create(
        name=POLLER_TASK_NAME,
        defaults={
            "task": POLLER_TASK_PATH,
            "interval": interval,
            "enabled": True,
        },
    )


def remove_schedule(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name=POLLER_TASK_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("reminders", "0001_initial"),
        ("django_celery_beat", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_schedule, remove_schedule),
    ]
