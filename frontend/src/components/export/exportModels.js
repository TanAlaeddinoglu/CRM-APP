const CUSTOMER_FIELDS = [
  { value: "id", label: "ID" },
  { value: "customer_name", label: "Ad" },
  { value: "customer_surname", label: "Soyad" },
  { value: "customer_email", label: "E-posta" },
  { value: "customer_phone", label: "Telefon" },
  { value: "date_of_birth", label: "Doğum Tarihi" },
  { value: "city", label: "Şehir" },
  { value: "status", label: "Durum" },
  { value: "source", label: "Kaynak" },
  { value: "is_active", label: "Aktif Müşteri" },
  { value: "assigned_to", label: "Atanan Kullanıcı" },
  { value: "tag", label: "Tag" },
  { value: "created_at", label: "Oluşturulma Tarihi" },
  { value: "updated_at", label: "Güncellenme Tarihi" },
];

const PRODUCT_FIELDS = [
  { value: "name", label: "Ad" },
  { value: "slug", label: "Slug" },
  { value: "description", label: "Açıklama" },
  { value: "created_at", label: "Oluşturulma Tarihi" },
  { value: "created_by", label: "Oluşturan Kişi" },
];

const EVENT_FIELDS = [
  { value: "customer", label: "Müşteri" },
  { value: "name", label: "Başlık" },
  { value: "appointment_type", label: "Tür" },
  { value: "product", label: "Ürün" },
  { value: "status", label: "Durum" },
  { value: "scheduled_for", label: "Tarih" },
  { value: "notes", label: "Notlar" },
  { value: "created_at", label: "Oluşturulma Tarihi" },
  { value: "updated_at", label: "Güncellenme Tarihi" },
];

const USER_FIELDS = [
  { value: "username", label: "Kullanıcı Adı" },
  { value: "first_name", label: "Ad" },
  { value: "last_name", label: "Soyad" },
  { value: "email", label: "E-posta" },
  { value: "role", label: "Rol" },
  { value: "is_active", label: "Aktif Mi" },
  { value: "last_login", label: "Son Giriş" },
  { value: "date_joined", label: "Kayıt Tarihi" },
];

// TODO fieldlari duzelt
const PAYMENT_FIELDS = [
  { value: "appointment", label: "Randevu" },
  { value: "amount", label: "Tutar" },
  { value: "currency", label: "Para Birimi" },
  { value: "payment_method", label: "Ödeme Yöntemi" },
  { value: "status", label: "Durum" },
  { value: "payment_date", label: "Ödeme Tarihi" },
  { value: "note", label: "Not" },
  { value: "created_at", label: "Oluşturulma Tarihi" },
];

const TAG_FIELDS = [
  { value: "id", label: "ID" },
  { value: "tag_name", label: "Tag Adı" },
  { value: "slug", label: "Slug" },
  { value: "description", label: "Açıklama" },
];

export const EXPORT_MODEL_CONFIGS = {
  customer: {
    model: "customer",
    title: "Müşteri",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: CUSTOMER_FIELDS,
    defaultFields: [
      "id",
      "customer_name",
      "customer_surname",
      "customer_email",
      "customer_phone",
      "status",
      "assigned_to",
      "tag",
      "created_at",
    ],
  },
  product: {
    model: "product",
    title: "Ürün",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: PRODUCT_FIELDS,
    defaultFields: ["id", "name", "slug", "description", "created_at"],
  },
  events: {
    model: "events",
    title: "Randevu",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: EVENT_FIELDS,
    defaultFields: [
      "id",
      "customer",
      "name",
      "appointment_type",
      "status",
      "scheduled_for",
    ],
  },
  user: {
    model: "user",
    title: "Kullanıcı",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: USER_FIELDS,
    defaultFields: [
      "id",
      "username",
      "first_name",
      "last_name",
      "email",
      "role",
      "is_active",
    ],
  },
  payments: {
    model: "payments",
    title: "Ödeme",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: PAYMENT_FIELDS,
    defaultFields: [
      "id",
      "appointment",
      "amount",
      "payment_method",
      "status",
      "payment_date",
    ],
  },
  tag: {
    model: "tag",
    title: "Tag",
    fileTypes: [
      { value: "excel", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV (.csv)" },
    ],
    defaultFileType: "excel",
    fields: TAG_FIELDS,
    defaultFields: ["id", "tag_name", "slug", "description"],
  },
};

export const getExportModelConfig = (model) => {
  const key = String(model || "").trim().toLowerCase();
  return EXPORT_MODEL_CONFIGS[key] || null;
};
