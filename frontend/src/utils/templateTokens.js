// Şablonlardaki {key} tokenları için ortak yardımcılar.
// Hem token pill render'ı (TemplateField) hem placeholder gösterimi (modal) kullanır.

// Şablondaki {key} tokenlarını okunabilir etiketle gösterir.
// Örn: "Randevu: {appointment_name}" → "Randevu: [Randevu adı]"
export function humanizeTemplate(template, variables) {
  if (!template) return "";
  const labelByKey = {};
  for (const v of variables || []) labelByKey[v.key] = v.label;
  return mapTemplate(template, {
    onText: (text) => text,
    onToken: (key, raw) => (labelByKey[key] ? `[${labelByKey[key]}]` : raw),
  });
}

export function escapeHtml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Şablonu tek geçişte dolaşır; metin parçaları için onText, {key} tokenları
// için onToken(key, rawMatch) çağrılır. Dönüşlerin birleşimini döndürür.
export function mapTemplate(template, { onText, onToken }) {
  const str = template || "";
  const re = /\{(\w+)\}/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    out += onText(str.slice(last, m.index));
    out += onToken(m[1], m[0]);
    last = m.index + m[0].length;
  }
  out += onText(str.slice(last));
  return out;
}
