export default function TokenButtonRow({ variables, fieldRef, disabled }) {
  if (!variables || variables.length === 0) return null;
  return (
    <div className="nrm-token-row">
      {variables.map((v) => (
        <button
          key={v.key}
          type="button"
          className="nrm-token"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fieldRef.current?.insert(v.key)}
          disabled={disabled}
          title={`{${v.key}}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
