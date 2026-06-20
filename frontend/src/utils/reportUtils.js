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

  const currencyLabels = ["Gelir", "Tutar", "Kalan", "Tahsil"];
  const percentLabels = ["%"];

  if (currencyLabels.some((word) => label.includes(word))) {
    return formatCurrency(value);
  }

  if (percentLabels.some((word) => label.includes(word))) {
    return formatPercent(value);
  }

  return value;
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
