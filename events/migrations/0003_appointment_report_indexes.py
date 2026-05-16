from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0002_alter_appointment_appointment_type"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["created_at"], name="events_appo_created_c3c2f8_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["status"], name="events_appo_status_eb36d8_idx"),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["product"], name="events_appo_product_aca683_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["customer", "created_at"], name="events_appo_custome_93cb09_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["product", "created_at"], name="events_appo_product_adb413_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointmentpayment",
            index=models.Index(
                fields=["payment_date"], name="events_appo_payment_56ad6b_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointmentpayment",
            index=models.Index(
                fields=["payment_status"], name="events_appo_payment_9e7bd3_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="appointmentpayment",
            index=models.Index(
                fields=["appointment", "payment_date"],
                name="events_appo_appoint_25640b_idx",
            ),
        ),
    ]
