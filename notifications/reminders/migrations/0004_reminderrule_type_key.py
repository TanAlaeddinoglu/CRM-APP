from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("reminders", "0003_reminderrule_channels")]

    operations = [
        migrations.AddField(
            model_name="reminderrule",
            name="type_key",
            field=models.CharField(
                default="reminders.appointment_reminder",
                max_length=100,
                verbose_name="Bildirim tipi",
            ),
        )
    ]
