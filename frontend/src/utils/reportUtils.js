export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function buildUserLabel(user) {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName ? `${fullName} (${user.username})` : user.username;
}

export function normalizeParams(filters) {
  const params = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      params[key] = value;
    }
  });

  if (params.date_from || params.date_to) {
    delete params.preset;
  }

  return params;
}

export function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "0";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";

  return `₺${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "-";

  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}%`;
}

export function formatMetric(label, value) {
  if (value === null || value === undefined || value === "") return "-";

  const percentLabels = ["%"];
  const currencyLabels = ["Gelir", "Tutar", "Kalan", "Tahsil", "Ciro", "Bakiye", "Ücret", "Ödeme"];

  if (percentLabels.some((word) => label.includes(word))) {
    return formatPercent(value);
  }

  if (currencyLabels.some((word) => label.includes(word))) {
    return formatCurrency(value);
  }

  return value;
}

export function formatShortDate(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}`;
}

export function compactCurrency(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1_000_000) return `₺${(numeric / 1_000_000).toFixed(1)} Mn`;
  if (numeric >= 1_000)     return `₺${(numeric / 1_000).toFixed(numeric >= 10_000 ? 0 : 1)} B`;
  return `₺${numeric}`;
}

export function renderCellValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";

  const currencyKeys = [
    "total_paid_amount",
    "total_remaining_amount",
    "completed_paid_amount",
    "partial_paid_amount",
    "cancelled_paid_amount",
  ];

  const percentKeys = [
    "sales_rate",
    "pending_rate",
    "negative_rate",
    "completed_rate",
    "partial_rate",
    "cancelled_rate",
    "conversion_rate",
    "rejection_rate",
  ];

  if (currencyKeys.includes(key)) {
    return formatCurrency(value);
  }

  if (percentKeys.includes(key)) {
    return formatPercent(value);
  }

  return value;
}
