from notifications.registry import registry

# Alıcılar (adminler) signal içinde hesaplanıp açıkça verilir.

registry.register(
    key="accounts.user_logged_in",
    label="Kullanıcı giriş yaptı",
    app_label="accounts",
    default_channels=["in_app"],
    default_title_template="Giriş yapıldı: {username}",
    default_body_template="{username} kullanıcısı giriş yaptı.",
    recipient_resolver=None,
    description="Normal bir kullanıcı (USER) giriş yaptığında adminlere bildirim gider.",
    variables=[
        {"key": "username", "label": "Kullanıcı adı"},
        {"key": "full_name", "label": "Ad soyad"},
        {"key": "role", "label": "Rol"},
        {"key": "login_time", "label": "Giriş zamanı"},
    ],
)
