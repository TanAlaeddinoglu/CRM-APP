import { useRef } from "react";
import { FileText, RotateCcw, Sliders } from "lucide-react";
import InfoTooltip from "../common/InfoTooltip.jsx";
import ChannelSelectionField from "./ChannelSelectionField.jsx";
import TemplateField from "./TemplateField.jsx";
import StatusToggle from "./StatusToggle.jsx";
import TokenButtonRow from "./TokenButtonRow.jsx";
import { humanizeTemplate } from "../../utils/templateTokens.js";

export default function NormalRuleForm({
  form,
  setForm,
  types,
  isEditing,
  isSystemDefault,
  isSaving,
  onResetTemplates,
}) {
  const titleFieldRef = useRef(null);
  const bodyFieldRef = useRef(null);

  const selectedType = types.find((t) => t.key === form.type_key);
  const variables = selectedType?.variables ?? [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (fieldName, value) =>
    setForm((prev) => ({ ...prev, [fieldName]: value }));

  return (
    <div className="rrm-two-col">
      {/* Sol bölüm — Kural Ayarları */}
      <div className="rrm-section">
        <div className="rrm-section-title">
          <Sliders size={12} strokeWidth={2.5} />
          <span>Kural Ayarları</span>
        </div>

        {isSystemDefault && (
          <p className="nrm-system-note">
            Varsayılan sistem kuralı — kural adı değiştirilemez.
          </p>
        )}

        <div className="nrm-row">
          <label className="nrm-label">Bildirim tipi</label>
          <select
            name="type_key"
            value={form.type_key}
            onChange={handleChange}
            className="nrm-input"
            disabled={isEditing || isSaving}
          >
            {types.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="nrm-row">
          <label className="nrm-label">Kural adı</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Örn: Randevu oluşturulduğunda bildir"
            className="nrm-input"
            disabled={isSystemDefault || isSaving}
          />
        </div>

        <div className="rrm-status-row">
          <span className="nrm-label">Durum</span>
          <StatusToggle
            value={form.is_active}
            onChange={(v) => setField("is_active", v)}
            disabled={isSaving}
          />
        </div>

        <div className="nrm-row">
          <label className="nrm-label">Kanallar</label>
          <ChannelSelectionField
            value={form.channels}
            onChange={(channels) => setField("channels", channels)}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Sağ bölüm — Şablonlar */}
      <div className="rrm-section">
        <div className="rrm-section-title">
          <FileText size={12} strokeWidth={2.5} />
          <span>Şablonlar</span>
          <button
            type="button"
            className="nrm-reset-btn"
            onClick={onResetTemplates}
            disabled={isSaving}
            title="Varsayılan şablona sıfırla"
          >
            <RotateCcw size={11} strokeWidth={2.2} />
            Sıfırla
          </button>
        </div>

        <div className="nrm-row">
          <label className="nrm-label">
            Başlık şablonu
            <span className="nrm-required">zorunlu</span>
            <InfoTooltip text="{değişken_adı} sözdizimi ile dinamik içerik eklenebilir. Örn: 'Randevunuz: {appointment_name}'. Değişken eklemek için aşağıdaki etiketlere tıklayın." />
          </label>
          <TemplateField
            ref={titleFieldRef}
            value={form.title_template}
            variables={variables}
            onChange={(v) => setField("title_template", v)}
            placeholder={
              humanizeTemplate(selectedType?.default_title_template, variables) ||
              "Başlık şablonu girin"
            }
            disabled={isSaving}
          />
          <TokenButtonRow variables={variables} fieldRef={titleFieldRef} disabled={isSaving} />
        </div>

        <div className="nrm-row">
          <label className="nrm-label">
            İçerik şablonu
            <span className="nrm-optional">isteğe bağlı</span>
            <InfoTooltip text="Bildirim gövdesi. Boş bırakılırsa bildirim tipinin varsayılan içeriği otomatik atanır. Değişken eklemek için aşağıdaki etiketlere tıklayın." />
          </label>
          <TemplateField
            ref={bodyFieldRef}
            value={form.body_template}
            variables={variables}
            multiline
            onChange={(v) => setField("body_template", v)}
            placeholder={
              humanizeTemplate(selectedType?.default_body_template, variables) ||
              "Boş bırakılırsa varsayılan içerik kullanılır"
            }
            disabled={isSaving}
          />
          <TokenButtonRow variables={variables} fieldRef={bodyFieldRef} disabled={isSaving} />
        </div>
      </div>
    </div>
  );
}
