const CHANNEL_OPTIONS = [
  { value: "in_app", label: "Uygulama İçi" },
  { value: "email", label: "E-posta" },
];

export default function ChannelSelectionField({
  value = [],
  onChange,
  disabled = false,
}) {
  const toggle = (channel) => {
    if (disabled) return;
    const next = value.includes(channel)
      ? value.filter((item) => item !== channel)
      : [...value, channel];
    onChange(next);
  };

  return (
    <div className="rrm-chip-group">
      {CHANNEL_OPTIONS.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label
            key={option.value}
            className={`rrm-chip ${checked ? "active" : ""}`}
            aria-pressed={checked}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(option.value)}
              disabled={disabled}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
