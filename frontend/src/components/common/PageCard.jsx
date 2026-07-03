import "../../assets/css/PageCard.css";

export default function PageCard({ children, className = "" }) {
  return <div className={`page-card ${className}`.trim()}>{children}</div>;
}
