from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customer", "0017_alter_customer_source"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(
                fields=["assigned_to"], name="customer_cu_assigne_474d7d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(
                fields=["created_at"], name="customer_cu_created_f5ff8c_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["tag"], name="customer_cu_tag_id_cb51eb_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(
                fields=["assigned_to", "status"], name="customer_cu_assigne_c409e0_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(
                fields=["assigned_to", "created_at"],
                name="customer_cu_assigne_45182d_idx",
            ),
        ),
    ]
