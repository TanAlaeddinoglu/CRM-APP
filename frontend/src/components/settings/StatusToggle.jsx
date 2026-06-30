export default function StatusToggle({ value, onChange, disabled }) {
  return (
    <div className="settings-toggle-group">
      <button
        type="button"
        className={`settings-toggle-option ${value ? "active" : ""}`}
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
      >
        Aktif
      </button>
      <button
        type="button"
        className={`settings-toggle-option ${!value ? "active" : ""}`}
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
      >
        Pasif
      </button>
    </div>
  );
}
