export default function CustomerTagSection({ tag }) {
  return (
    <div className="customer-tag-section">
      <h3>Current Tag</h3>

      <div className="tag-pill">
        {tag ? tag : "No Tag"}
      </div>
    </div>
  );
}
