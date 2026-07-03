"""Export bildirim sinyali testleri (status geçişi)."""
import pytest

import exporter.notifications.notification_types  # noqa: registry'yi doldur
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def rules(db):
    for key, name in [
        ("exporter.export_completed", "Export tamamlandı"),
        ("exporter.export_failed", "Export başarısız"),
    ]:
        NotificationRule.objects.get_or_create(
            type_key=key,
            is_system_default=True,
            defaults={"name": name, "channels": ["in_app"], "is_active": True},
        )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="e_admin", email="e_admin@x.com", password="Pass123!", role="ADMIN"
    )


@pytest.fixture
def regular_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="e_user", email="e_user@x.com", password="Pass123!", role="USER"
    )


def _make_job(created_by):
    from exporter.models import ExportJob

    return ExportJob.objects.create(
        created_by=created_by,
        model_name="Customer",
        file_type="csv",
        recipient_email="x@x.com",
        status=ExportJob.Status.QUEUED,
    )


def test_export_completed_notifies_creator_and_admins(admin_user, regular_user):
    job = _make_job(created_by=regular_user)
    Notification.objects.all().delete()

    job.status = "completed"
    job.save()

    assert Notification.objects.filter(
        recipient=regular_user, type_key="exporter.export_completed"
    ).exists()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="exporter.export_completed"
    ).exists()


def test_export_failed_notifies(admin_user, regular_user):
    job = _make_job(created_by=regular_user)
    Notification.objects.all().delete()

    job.status = "failed"
    job.save()

    assert Notification.objects.filter(
        recipient=regular_user, type_key="exporter.export_failed"
    ).exists()


def test_export_status_unchanged_no_notification(admin_user, regular_user):
    job = _make_job(created_by=regular_user)
    job.status = "completed"
    job.save()
    Notification.objects.all().delete()

    job.row_count = 5
    job.save()

    assert (
        Notification.objects.filter(type_key="exporter.export_completed").count() == 0
    )
