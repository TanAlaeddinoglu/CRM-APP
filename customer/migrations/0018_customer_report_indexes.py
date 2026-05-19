from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customer", "0017_alter_customer_source"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE INDEX IF NOT EXISTS customer_cu_assigne_474d7d_idx
                    ON customer_customer (assigned_to_id);
                    CREATE INDEX IF NOT EXISTS customer_cu_created_f5ff8c_idx
                    ON customer_customer (created_at);
                    CREATE INDEX IF NOT EXISTS customer_cu_tag_id_cb51eb_idx
                    ON customer_customer (tag_id);
                    CREATE INDEX IF NOT EXISTS customer_cu_assigne_c409e0_idx
                    ON customer_customer (assigned_to_id, status);
                    CREATE INDEX IF NOT EXISTS customer_cu_assigne_45182d_idx
                    ON customer_customer (assigned_to_id, created_at);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
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
                    index=models.Index(
                        fields=["tag"], name="customer_cu_tag_id_cb51eb_idx"
                    ),
                ),
                migrations.AddIndex(
                    model_name="customer",
                    index=models.Index(
                        fields=["assigned_to", "status"],
                        name="customer_cu_assigne_c409e0_idx",
                    ),
                ),
                migrations.AddIndex(
                    model_name="customer",
                    index=models.Index(
                        fields=["assigned_to", "created_at"],
                        name="customer_cu_assigne_45182d_idx",
                    ),
                ),
            ],
        ),
    ]
