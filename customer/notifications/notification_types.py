from notifications.registry import registry

# Alıcılar signal içinde hesaplanıp açıkça verilir (recipient_resolver=None).

registry.register(
    key="customer.customer_created",
    label="Müşteri oluşturuldu",
    app_label="customer",
    default_channels=["in_app"],
    default_title_template="Yeni müşteri: {customer_name}",
    default_body_template="{customer_name} müşterisi oluşturuldu.",
    recipient_resolver=None,
    description=(
        "Bir müşteri oluşturulduğunda, oluşturan normal kullanıcı ise adminlere "
        "bildirim gider."
    ),
    variables=[
        {"key": "customer_name", "label": "Müşteri tam adı"},
        {"key": "created_by_name", "label": "Oluşturan"},
        {"key": "customer_phone", "label": "Telefon"},
        {"key": "customer_city", "label": "Şehir"},
    ],
)

registry.register(
    key="customer.customer_assigned",
    label="Müşteri atandı",
    app_label="customer",
    default_channels=["in_app"],
    default_title_template="Müşteri atandı: {customer_name}",
    default_body_template="{customer_name} müşterisi size atandı.",
    recipient_resolver=None,
    description=(
        "Bir admin müşteriyi bir kullanıcıya atadığında, atanan kullanıcıya "
        "bildirim gider."
    ),
    variables=[
        {"key": "customer_name", "label": "Müşteri tam adı"},
        {"key": "assigned_to_name", "label": "Atanan kullanıcı"},
        {"key": "assigned_by_name", "label": "Atayan"},
    ],
)

registry.register(
    key="tags.tag_created",
    label="Etiket oluşturuldu",
    app_label="customer",
    default_channels=["in_app"],
    default_title_template="Yeni etiket: {tag_name}",
    default_body_template="{tag_name} etiketi oluşturuldu.",
    recipient_resolver=None,
    description="Yeni bir etiket oluşturulduğunda adminlere bildirim gider.",
    variables=[{"key": "tag_name", "label": "Etiket adı"}],
)

registry.register(
    key="tags.tag_updated",
    label="Etiket güncellendi",
    app_label="customer",
    default_channels=["in_app"],
    default_title_template="Etiket güncellendi: {tag_name}",
    default_body_template="{tag_name} etiketi güncellendi.",
    recipient_resolver=None,
    description="Bir etiket güncellendiğinde adminlere bildirim gider.",
    variables=[{"key": "tag_name", "label": "Etiket adı"}],
)

registry.register(
    key="tags.tag_deleted",
    label="Etiket silindi",
    app_label="customer",
    default_channels=["in_app"],
    default_title_template="Etiket silindi: {tag_name}",
    default_body_template="{tag_name} etiketi silindi.",
    recipient_resolver=None,
    description="Bir etiket silindiğinde adminlere bildirim gider.",
    variables=[{"key": "tag_name", "label": "Etiket adı"}],
)
