// Bildirim kategorileri: type_key öneki (app_label) -> Türkçe grup etiketi.
// Yeni bildirim türleri eklendiğinde buraya öneki eklemek yeterli.
export const CATEGORY_LABELS = {
  events: "Etkinlik Bildirimleri",
  customer: "Müşteri Bildirimleri",
  tags: "Etiket Bildirimleri",
  products: "Ürün Bildirimleri",
  accounts: "Kullanıcı Bildirimleri",
  exporter: "Dışa Aktarma Bildirimleri",
};

// Grupların sabit gösterim sırası. Listede olmayanlar sona, alfabetik gelir.
const CATEGORY_ORDER = [
  "Müşteri Bildirimleri",
  "Etkinlik Bildirimleri",
  "Etiket Bildirimleri",
  "Ürün Bildirimleri",
  "Kullanıcı Bildirimleri",
  "Dışa Aktarma Bildirimleri",
  "Diğer",
];

export function getCategory(notification) {
  const prefix = (notification?.type_key || "").split(".")[0];
  return CATEGORY_LABELS[prefix] || "Diğer";
}

// Bildirimleri okunma durumuna göre filtreler ve kategoriye göre gruplar.
// read === false -> sadece okunmamışlar, read === true -> sadece okunanlar.
// Dönüş: [{ category, items }] (kategori sırasına göre, boş gruplar atlanır)
export function groupNotifications(notifications, { read }) {
  const filtered = (notifications || []).filter((n) => Boolean(n.is_read) === read);

  const map = new Map();
  for (const n of filtered) {
    const category = getCategory(n);
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(n);
  }

  return Array.from(map.keys())
    .sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, "tr");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .map((category) => ({ category, items: map.get(category) }));
}
