from django.db import transaction

from notifications.utils import active_admins, format_user_name


def on_user_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._orig_last_login = sender.objects.values_list(
                "last_login", flat=True
            ).get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._orig_last_login = None
    else:
        instance._orig_last_login = None


def on_user_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    if created:
        return

    # Login view, başarılı girişte last_login'i güncelliyor; bunu giriş
    # sinyali olarak kullanırız. Yalnızca normal kullanıcı (USER) girişleri.
    orig = getattr(instance, "_orig_last_login", None)
    if instance.last_login is None or instance.last_login == orig:
        return
    if instance.role != "USER":
        return

    recipients = active_admins()
    if not recipients:
        return

    payload = {
        "username": instance.username,
        "full_name": format_user_name(instance),
        "role": instance.get_role_display()
        if hasattr(instance, "get_role_display")
        else instance.role,
        "login_time": instance.last_login.strftime("%d.%m.%Y %H:%M")
        if instance.last_login
        else "",
    }
    transaction.on_commit(
        lambda: notify(
            "accounts.user_logged_in",
            payload=payload,
            recipients=recipients,
            target=instance,
        )
    )
