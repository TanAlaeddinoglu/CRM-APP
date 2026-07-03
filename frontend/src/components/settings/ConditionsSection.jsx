import { Filter, Plus, Trash2 } from "lucide-react";
import InfoTooltip from "../common/InfoTooltip.jsx";

export default function ConditionsSection({ conditions, conditionFields, onChange, disabled }) {
  const choicesFor = (fieldName) =>
    conditionFields.find((f) => f.name === fieldName)?.choices ?? [];

  const addCondition = () => {
    const first = conditionFields[0];
    onChange([
      ...conditions,
      { field_name: first?.name ?? "", value: first?.choices?.[0]?.value ?? "" },
    ]);
  };

  const removeCondition = (index) =>
    onChange(conditions.filter((_, i) => i !== index));

  const changeField = (index, fieldName) => {
    const field = conditionFields.find((f) => f.name === fieldName);
    const nextValue = field?.choices?.[0]?.value ?? "";
    onChange(conditions.map((c, i) => (i === index ? { field_name: fieldName, value: nextValue } : c)));
  };

  const changeValue = (index, value) =>
    onChange(conditions.map((c, i) => (i === index ? { ...c, value } : c)));

  return (
    <div className="rrm-section">
      <div className="rrm-section-title">
        <Filter size={12} strokeWidth={2.5} />
        <span>Koşullar</span>
        <InfoTooltip text="Tüm koşullar VE ile birleşir — yalnızca tamamını karşılayan randevular bu kuralı tetikler. Koşul eklenmezse kural tüm randevulara uygulanır." />
      </div>
      {conditions.map((cond, index) => (
        <div className="rrm-cond-row" key={index}>
          <select
            className="nrm-input"
            value={cond.field_name}
            onChange={(e) => changeField(index, e.target.value)}
            disabled={disabled}
          >
            {conditionFields.map((f) => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
          <span className="rrm-cond-eq">=</span>
          <select
            className="nrm-input"
            value={cond.value}
            onChange={(e) => changeValue(index, e.target.value)}
            disabled={disabled}
          >
            {choicesFor(cond.field_name).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="settings-rule-action-btn delete"
            aria-label="Koşulu kaldır"
            title="Koşulu kaldır"
            onClick={() => removeCondition(index)}
            disabled={disabled}
          >
            <Trash2 size={13} strokeWidth={2.2} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rrm-add-btn"
        onClick={addCondition}
        disabled={disabled || conditionFields.length === 0}
      >
        <Plus size={12} /> Koşul ekle
      </button>
    </div>
  );
}
