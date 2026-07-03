function formatAmount(value) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

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
          <th>Sorumlu</th>
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

            <td>{p.assigned_user_name ?? "-"}</td>

            <td>{p.appointment?.name ?? "-"}</td>

            <td>{formatAmount(p.paid_amount)} ₺</td>

            <td>{formatAmount(p.remaining_amount)} ₺</td>

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
      {getPaymentStatusLabel(normalized)}
    </span>
  );
}

function getPaymentStatusLabel(status) {
  if (status === "tamamlandi") return "Tamamlandı";
  if (status === "kismi") return "Kısmi";
  if (status === "iptal") return "İptal";

  return status || "-";
}
