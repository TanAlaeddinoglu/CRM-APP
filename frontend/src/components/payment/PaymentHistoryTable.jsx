function formatDate(dateString) {
  if (!dateString) return "-";

  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

export default function PaymentHistoryTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="payment-empty">
        Kayıt bulunamadı.
      </div>
    );
  }

  return (
    <table className="payment-table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Randevu</th>
          <th>Ödenen</th>
          <th>Kalan</th>
          <th>Durum</th>
        </tr>
      </thead>

      <tbody>
        {rows.map(p => (
          <tr key={p.id}>
            <td>{formatDate(p.payment_date)}</td>

            <td>{p.appointment?.customer ?? "-"}</td>

            <td>{p.appointment?.name ?? "-"}</td>

            <td>{p.paid_amount} ₺</td>

            <td>{p.remaining_amount} ₺</td>

            <td>
              <PaymentStatusBadge
                status={p.payment_status}
                paidAmount={p.paid_amount}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentStatusBadge({ status, paidAmount }) {
  const normalized = String(status || "").toLowerCase();
  const isPaymentNotStarted =
    normalized === "kismi" && Number(paidAmount || 0) === 0;

  if (isPaymentNotStarted) {
    return (
      <span className="payment-status not-started">
        Ödemeye başlanmadı
      </span>
    );
  }

  return (
    <span className={`payment-status ${normalized}`}>
      {status || "-"}
    </span>
  );
}
