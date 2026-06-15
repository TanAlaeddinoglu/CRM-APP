export default function LoadingIndicator({
  inline = false,
  label = "Yükleniyor",
  className = "",
}) {
  const classes = [
    "loading-indicator",
    inline ? "loading-indicator-inline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="status" aria-live="polite" aria-label={label}>
      <span className="loading-indicator__dot" />
    </div>
  );
}
