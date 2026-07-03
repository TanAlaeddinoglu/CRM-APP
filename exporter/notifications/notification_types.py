from notifications.registry import registry

# Alıcılar (export'u başlatan + adminler) signal içinde hesaplanıp verilir.

registry.register(
    key="exporter.export_completed",
    label="Export tamamlandı",
    app_label="exporter",
    default_channels=["in_app"],
    default_title_template="Export tamamlandı: {model_name}",
    default_body_template="{model_name} ({file_type}) dışa aktarımı tamamlandı.",
    recipient_resolver=None,
    description=(
        "Bir dışa aktarma tamamlandığında, işlemi başlatan kullanıcıya ve "
        "adminlere bildirim gider."
    ),
    variables=[
        {"key": "model_name", "label": "Veri tipi"},
        {"key": "file_type", "label": "Dosya türü"},
        {"key": "row_count", "label": "Satır sayısı"},
        {"key": "created_by_name", "label": "Başlatan"},
    ],
)

registry.register(
    key="exporter.export_failed",
    label="Export başarısız",
    app_label="exporter",
    default_channels=["in_app"],
    default_title_template="Export başarısız: {model_name}",
    default_body_template="{model_name} ({file_type}) dışa aktarımı başarısız oldu.",
    recipient_resolver=None,
    description=(
        "Bir dışa aktarma başarısız olduğunda, işlemi başlatan kullanıcıya ve "
        "adminlere bildirim gider."
    ),
    variables=[
        {"key": "model_name", "label": "Veri tipi"},
        {"key": "file_type", "label": "Dosya türü"},
        {"key": "error_message", "label": "Hata mesajı"},
        {"key": "created_by_name", "label": "Başlatan"},
    ],
)
