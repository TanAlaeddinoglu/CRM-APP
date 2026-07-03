// Bir bildirimden tıklanınca gidilecek uygulama rotasını üretir.
// Müşteri ve etkinlik (randevu) bildirimlerinde doğrudan ilgili müşteriye gider.
// Hedef yoksa null döner (tıklama yalnız "okundu" işaretler, yönlendirme yapmaz).
export function getNotificationUrl(notification) {
  if (!notification) return null;

  const key = notification.type_key || "";
  const prefix = key.split(".")[0];
  const payload = notification.context_payload || {};
  const customerId = payload.customer_id;

  switch (prefix) {
    case "events":
      // Randevu bildirimleri → ilgili müşteri detayına
      return customerId ? `/customers/${customerId}` : "/events";

    case "customer":
      // Müşteri bildiriminde hedef nesne müşteridir
      if (notification.content_type_label === "customer" && notification.target_object_id) {
        return `/customers/${notification.target_object_id}`;
      }
      return customerId ? `/customers/${customerId}` : "/customers";

    case "tags":
      return "/tags";

    case "products":
      return "/products";

    case "exporter":
      return "/exports/history";

    // accounts (kullanıcı girişi) vb. için yönlendirme yok
    default:
      return null;
  }
}
