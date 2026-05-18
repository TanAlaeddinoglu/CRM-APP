import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Mail,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import {
  clearExportHistoryCache,
  ensureExportHistoryCacheExpiry,
  EXPORT_HISTORY_CACHE_KEY,
  getExportHistory,
  getExportHistoryMeta,
  scheduleExportHistoryCacheExpiry,
} from "../services/export";
import "../assets/css/ExportHistory.css";

const MODEL_OPTIONS = [
  { value: "", label: "Tum modeller" },
  { value: "customer", label: "Customer" },
  { value: "events", label: "Events" },
  { value: "payments", label: "Payments" },
  { value: "product", label: "Products" },
  { value: "tag", label: "Tags" },
  { value: "user", label: "Users" },
];

const STATUS_TONE_MAP = {
  completed: "success",
  completed_with_errors: "warning",
  processing: "info",
  queued: "neutral",
  failed: "danger",
  created: "success",
  create_failed: "danger",
  deleted: "neutral",
  delete_failed: "danger",
  sent: "success",
  pending: "info",
  skipped: "neutral",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const CACHE_TTL_MS = 5 * 60 * 1000;
const META_POLL_INTERVAL_MS = 100 * 1000;
const FULL_REFRESH_EVERY_N_POLLS = 3;

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

function formatLabel(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEmailStatusMessage(emailStatus) {
  switch (emailStatus) {
    case "sent":
      return "Email basariyla gonderildi.";
    case "failed":
      return "Email gonderilemedi. Mail ayarlarinizi kontrol edip tekrar deneyin.";
    case "pending":
      return "Email gonderimi sirada bekliyor.";
    case "skipped":
      return "Bu export icin email gonderimi yapilmadi.";
    default:
      return "Bu export icin email kaydi olusturulmadi.";
  }
}

function deriveMetaFromJobs(items) {
  const latestUpdatedAt = items.reduce((latest, job) => {
    if (!job?.updated_at) return latest;
    if (!latest) return job.updated_at;
    return new Date(job.updated_at) > new Date(latest) ? job.updated_at : latest;
  }, null);

  return {
    count: items.length,
    latest_updated_at: latestUpdatedAt,
  };
}

function buildMetaSignature(meta) {
  return `${meta?.count || 0}:${meta?.latest_updated_at || ""}`;
}

function readCachedHistory() {
  try {
    const rawValue = sessionStorage.getItem(EXPORT_HISTORY_CACHE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (!parsed?.expires_at || !Array.isArray(parsed?.jobs)) {
      clearExportHistoryCache();
      return null;
    }

    if (Date.now() > parsed.expires_at) {
      clearExportHistoryCache();
      return null;
    }

    return parsed;
  } catch {
    clearExportHistoryCache();
    return null;
  }
}

function writeCachedHistory(jobs, meta) {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  sessionStorage.setItem(
    EXPORT_HISTORY_CACHE_KEY,
    JSON.stringify({
      jobs,
      meta,
      expires_at: expiresAt,
    })
  );
  return expiresAt;
}

function StatusPill({ value }) {
  const tone = STATUS_TONE_MAP[value] || "neutral";
  return (
    <span className={`export-status-pill export-status-pill-${tone}`}>
      {formatLabel(value)}
    </span>
  );
}

function ExportDetailModal({ job, onClose }) {
  if (!job) return null;

  return (
    <div className="modal-background" onClick={onClose}>
      <div
        className="modal-box export-history-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="export-history-modal-header">
          <div>
            <h3>Export Detayi</h3>
            <p>
              Job #{job.id} · {formatLabel(job.model_name)} ·{" "}
              {formatDateTime(job.created_at)}
            </p>
          </div>
          <button
            type="button"
            className="export-icon-button"
            onClick={onClose}
            aria-label="Detay penceresini kapat"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="export-history-modal-body">
          <section className="export-detail-section">
            <div className="export-detail-section-title">
              <Download size={16} />
              <span>Export Ozeti</span>
            </div>

            <div className="export-detail-grid">
              <div className="export-detail-item">
                <span>Model</span>
                <strong>{formatLabel(job.model_name)}</strong>
              </div>
              <div className="export-detail-item">
                <span>Dosya Tipi</span>
                <strong>{job.file_type?.toUpperCase() || "-"}</strong>
              </div>
              <div className="export-detail-item">
                <span>Olusturan</span>
                <strong>{job.created_by || "-"}</strong>
              </div>
              <div className="export-detail-item">
                <span>Kayit Sayisi</span>
                <strong>{job.row_count}</strong>
              </div>
              <div className="export-detail-item">
                <span>Genel Durum</span>
                <StatusPill value={job.status} />
              </div>
              <div className="export-detail-item">
                <span>Email Durumu</span>
                <StatusPill value={job.email_status} />
              </div>
            </div>

            <div className="export-detail-fields">
              <span>Secilen Alanlar</span>
              <div className="export-chip-list">
                {job.selected_fields?.length ? (
                  job.selected_fields.map((field) => (
                    <span key={field} className="export-chip">
                      {field}
                    </span>
                  ))
                ) : (
                  <span className="export-empty-inline">Alan secimi yok</span>
                )}
              </div>
            </div>
          </section>

          <section className="export-detail-section">
            <div className="export-detail-section-title">
              <Mail size={16} />
              <span>Email Bilgisi</span>
            </div>

            <div className="export-detail-grid">
              <div className="export-detail-item export-detail-item-wide">
                <span>Konu</span>
                <strong>{job.email_subject || "-"}</strong>
              </div>
              <div className="export-detail-item export-detail-item-wide">
                <span>Alici</span>
                <strong>{job.recipient_email || "-"}</strong>
              </div>
              <div className="export-detail-item">
                <span>Durum</span>
                <StatusPill value={job.email_status} />
              </div>
            </div>

            <div className="export-detail-stack">
              <div className="export-detail-text-block">
                <span>Email Govdesi</span>
                <p>{job.email_body || "-"}</p>
              </div>

              <div className="export-detail-text-block">
                <span>Durum Notu</span>
                <p>{getEmailStatusMessage(job.email_status)}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ExportHistoryPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const metaSignatureRef = useRef("0:");
  const pollCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const applyJobs = (nextJobs, meta) => {
      if (!isMounted) return;

      setJobs(nextJobs);
      setSelectedJob((current) =>
        current ? nextJobs.find((job) => job.id === current.id) || null : null
      );
      metaSignatureRef.current = buildMetaSignature(meta);
    };

    const fetchFullHistory = async ({
      showLoader = false,
      persistToCache = false,
    } = {}) => {
      if (showLoader && isMounted) {
        setLoading(true);
      }

      try {
        const response = await getExportHistory();
        const nextJobs = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];
        const nextMeta = deriveMetaFromJobs(nextJobs);

        applyJobs(nextJobs, nextMeta);
        if (persistToCache) {
          const expiresAt = writeCachedHistory(nextJobs, nextMeta);
          scheduleExportHistoryCacheExpiry(expiresAt);
        }

        if (isMounted) {
          setError("");
        }
      } catch (requestError) {
        if (!isMounted) return;

        const detail =
          requestError?.response?.data?.detail ||
          "Export gecmisi yuklenemedi.";
        setError(detail);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const checkForUpdates = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        pollCountRef.current += 1;

        if (pollCountRef.current % FULL_REFRESH_EVERY_N_POLLS === 0) {
          await fetchFullHistory();
          return;
        }

        const response = await getExportHistoryMeta();
        const nextSignature = buildMetaSignature(response.data || {});

        if (nextSignature !== metaSignatureRef.current) {
          await fetchFullHistory();
        }
      } catch (requestError) {
        if (!isMounted) return;

        const detail =
          requestError?.response?.data?.detail ||
          "Export gecmisi guncellenemedi.";
        setError(detail);
      }
    };

    const cachedHistory = readCachedHistory();
    if (cachedHistory) {
      ensureExportHistoryCacheExpiry();
      applyJobs(
        cachedHistory.jobs,
        cachedHistory.meta || deriveMetaFromJobs(cachedHistory.jobs)
      );
      setLoading(false);
      setError("");
      checkForUpdates();
    } else {
      fetchFullHistory({ showLoader: true, persistToCache: true });
    }

    const intervalId = window.setInterval(() => {
      checkForUpdates();
    }, META_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (modelFilter && job.model_name !== modelFilter) {
        return false;
      }

      const createdAt = new Date(job.created_at);

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (createdAt < from) return false;
      }

      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (createdAt > to) return false;
      }

      return true;
    });
  }, [jobs, dateFrom, dateTo, modelFilter]);

  const summary = useMemo(() => {
    return {
      total: filteredJobs.length,
      sent: filteredJobs.filter((job) => job.email_status === "sent").length,
      failed: filteredJobs.filter((job) => job.status === "failed").length,
      pending: filteredJobs.filter((job) =>
        ["queued", "processing"].includes(job.status)
      ).length,
    };
  }, [filteredJobs]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));

  const paginatedJobs = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredJobs.slice(startIndex, startIndex + pageSize);
  }, [filteredJobs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, modelFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setModelFilter("");
  };

  return (
    <div className="export-history-page">
      <div className="export-history-header">
        <div>
          <h1 className="export-history-title">Export Gecmisi</h1>
          <p className="export-history-subtitle">
            Export islemlerini ve ilgili email log kayitlarini tek ekranda izle.
          </p>
        </div>
      </div>

      <section className="export-history-summary-grid">
        <div className="export-summary-card">
          <span>Toplam Export</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="export-summary-card">
          <span>Basarili Gonderim</span>
          <strong>{summary.sent}</strong>
        </div>
        <div className="export-summary-card">
          <span>Bekleyen Islem</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="export-summary-card">
          <span>Hatali Export</span>
          <strong>{summary.failed}</strong>
        </div>
      </section>

      <section className="export-filter-panel">
        <div className="export-filter-panel-header">
          <div className="export-filter-title">
            <Filter size={16} />
            <span>Filtreler</span>
          </div>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            <RotateCcw size={14} />
            <span>Temizle</span>
          </button>
        </div>

        <div className="export-filter-grid">
          <label className="export-filter-field">
            <span>
              <CalendarRange size={14} />
              <span>Baslangic Tarihi</span>
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="export-filter-field">
            <span>
              <CalendarRange size={14} />
              <span>Bitis Tarihi</span>
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label className="export-filter-field">
            <span>
              <FileText size={14} />
              <span>Model</span>
            </span>
            <select
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="export-table-panel">
        <div className="export-table-panel-header">
          <div>
            <h2>Export Job Listesi</h2>
            <p>{filteredJobs.length} kayit gosteriliyor</p>
          </div>

          <div className="export-table-controls">
            <label className="export-page-size-control">
              <span>Sayfa Boyutu</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="export-empty-state">Yukleniyor...</div>
        ) : error ? (
          <div className="export-empty-state export-empty-state-error">{error}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="export-empty-state">
            Secili filtrelerle eslesen export kaydi bulunamadi.
          </div>
        ) : (
          <>
            <div className="export-table-wrapper">
              <table className="export-history-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Model</th>
                    <th>Dosya</th>
                    <th>Alici</th>
                    <th>Genel Durum</th>
                    <th>Dosya Durumu</th>
                    <th>Email Durumu</th>
                    <th>Olusturan</th>
                    <th>Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="export-primary-cell">
                          <strong>{formatDateTime(job.created_at)}</strong>
                          <span>Job #{job.id}</span>
                        </div>
                      </td>
                      <td>{formatLabel(job.model_name)}</td>
                      <td>
                        <div className="export-primary-cell">
                          <strong>{job.file_type?.toUpperCase()}</strong>
                          <span>{job.row_count} satir</span>
                        </div>
                      </td>
                      <td>{job.recipient_email}</td>
                      <td>
                        <StatusPill value={job.status} />
                      </td>
                      <td>
                        <StatusPill value={job.file_status} />
                      </td>
                      <td>
                        <StatusPill value={job.email_status} />
                      </td>
                      <td>
                        <div className="export-inline-meta">
                          <User size={14} />
                          <span>{job.created_by || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="export-detail-button"
                          onClick={() => setSelectedJob(job)}
                        >
                          <span>Detay</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="export-pagination-bar">
              <span className="export-pagination-meta">
                Sayfa {page} / {totalPages}
              </span>

              <div className="export-pagination-actions">
                <button
                  type="button"
                  className="export-pagination-button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={14} />
                  <span>Onceki</span>
                </button>

                <button
                  type="button"
                  className="export-pagination-button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                >
                  <span>Sonraki</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <ExportDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
