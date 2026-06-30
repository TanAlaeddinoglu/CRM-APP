import { Bell, Plus, Trash2 } from "lucide-react";
import InfoTooltip from "../common/InfoTooltip.jsx";

const UNIT_OPTIONS = [
  { value: "days", label: "Gün" },
  { value: "hours", label: "Saat" },
  { value: "minutes", label: "Dakika" },
];

const DIRECTION_OPTIONS = [
  { value: "before", label: "Önce" },
  { value: "after", label: "Sonra" },
];

export default function OffsetSection({ offsets, onChange, disabled }) {
  const addOffset = () =>
    onChange([...offsets, { amount: 1, unit: "hours", direction: "before" }]);

  const removeOffset = (index) =>
    onChange(offsets.filter((_, i) => i !== index));

  const changeOffset = (index, patch) =>
    onChange(offsets.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  return (
    <div className="rrm-section">
      <div className="rrm-section-title">
        <Bell size={12} strokeWidth={2.5} />
        <span>Hatırlatma zamanları</span>
        <span className="nrm-required">zorunlu</span>
        <InfoTooltip text="Her satır ayrı bir hatırlatma üretir. Örn: '1 gün önce' ve '1 saat önce' eklerseniz iki ayrı bildirim gönderilir. Randevu saati geçmişse bekleyen hatırlatmalar bir sonraki döngüde tetiklenir." />
      </div>
      {offsets.map((offset, index) => (
        <div className="rrm-offset-row" key={index}>
          <input
            type="number"
            min={1}
            className="nrm-input rrm-amount"
            value={offset.amount}
            onChange={(e) => changeOffset(index, { amount: Number(e.target.value) })}
            disabled={disabled}
          />
          <select
            className="nrm-input"
            value={offset.unit}
            onChange={(e) => changeOffset(index, { unit: e.target.value })}
            disabled={disabled}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <select
            className="nrm-input"
            value={offset.direction}
            onChange={(e) => changeOffset(index, { direction: e.target.value })}
            disabled={disabled}
          >
            {DIRECTION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="settings-rule-action-btn delete"
            aria-label="Zamanı kaldır"
            title="Zamanı kaldır"
            onClick={() => removeOffset(index)}
            disabled={disabled || offsets.length === 1}
          >
            <Trash2 size={13} strokeWidth={2.2} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rrm-add-btn"
        onClick={addOffset}
        disabled={disabled}
      >
        <Plus size={12} /> Zaman ekle
      </button>
    </div>
  );
}
