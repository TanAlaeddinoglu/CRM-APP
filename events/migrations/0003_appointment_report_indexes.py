from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0002_alter_appointment_appointment_type"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE INDEX IF NOT EXISTS events_appo_created_c3c2f8_idx
                    ON events_appointment (created_at);
                    CREATE INDEX IF NOT EXISTS events_appo_status_eb36d8_idx
                    ON events_appointment (status);
                    CREATE INDEX IF NOT EXISTS events_appo_product_aca683_idx
                    ON events_appointment (product_id);
                    CREATE INDEX IF NOT EXISTS events_appo_custome_93cb09_idx
                    ON events_appointment (customer_id, created_at);
                    CREATE INDEX IF NOT EXISTS events_appo_product_adb413_idx
                    ON events_appointment (product_id, created_at);
                    CREATE INDEX IF NOT EXISTS events_appo_payment_56ad6b_idx
                    ON events_appointmentpayment (payment_date);
                    CREATE INDEX IF NOT EXISTS events_appo_payment_9e7bd3_idx
                    ON events_appointmentpayment (payment_status);
                    CREATE INDEX IF NOT EXISTS events_appo_appoint_25640b_idx
                    ON events_appointmentpayment (appointment_id, payment_date);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="appointment",
                    index=models.Index(
                        fields=["created_at"], name="events_appo_created_c3c2f8_idx"
                    ),
                ),
                migrations.AddIndex(
                    model_name="appointment",
                    index=models.Index(
                        fields=["status"], name="events_appo_status_eb36d8_idx"
                    ),
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
                        fields=["customer", "created_at"],
                        name="events_appo_custome_93cb09_idx",
                    ),
                ),
                migrations.AddIndex(
                    model_name="appointment",
                    index=models.Index(
                        fields=["product", "created_at"],
                        name="events_appo_product_adb413_idx",
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
            ],
        ),
    ]
