from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customer", "0015_alter_customer_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customer",
            name="customer_surname",
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
