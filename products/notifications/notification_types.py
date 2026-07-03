from notifications.registry import registry

# Alıcılar (adminler) signal içinde hesaplanıp açıkça verilir.

registry.register(
    key="products.product_created",
    label="Ürün oluşturuldu",
    app_label="products",
    default_channels=["in_app"],
    default_title_template="Yeni ürün: {product_name}",
    default_body_template="{product_name} ürünü oluşturuldu.",
    recipient_resolver=None,
    description="Yeni bir ürün oluşturulduğunda adminlere bildirim gider.",
    variables=[{"key": "product_name", "label": "Ürün adı"}],
)

registry.register(
    key="products.product_updated",
    label="Ürün güncellendi",
    app_label="products",
    default_channels=["in_app"],
    default_title_template="Ürün güncellendi: {product_name}",
    default_body_template="{product_name} ürünü güncellendi.",
    recipient_resolver=None,
    description="Bir ürün güncellendiğinde adminlere bildirim gider.",
    variables=[{"key": "product_name", "label": "Ürün adı"}],
)

registry.register(
    key="products.product_deleted",
    label="Ürün silindi",
    app_label="products",
    default_channels=["in_app"],
    default_title_template="Ürün silindi: {product_name}",
    default_body_template="{product_name} ürünü silindi.",
    recipient_resolver=None,
    description="Bir ürün silindiğinde adminlere bildirim gider.",
    variables=[{"key": "product_name", "label": "Ürün adı"}],
)
