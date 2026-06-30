import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ExcelImportModal from "../../../src/components/customer/ExcelImportModal.jsx";

const users = [
  { id: 1, username: "admin" },
  { id: 2, username: "Erdem" },
];

const baseProps = {
  open: true,
  onClose: vi.fn(),
  setRows: vi.fn(),
  saving: false,
  onSave: vi.fn(),
  tags: [],
  users,
};

describe("ExcelImportModal mapping", () => {
  it("does not offer Tag, Assigned, or Updated in column mapping selects", () => {
    render(
      <ExcelImportModal
        {...baseProps}
        step="mapping"
        columns={["full_name", "phone_number", "created_time"]}
        sampleRows={[
          {
            full_name: "Ali Şahin",
            phone_number: "+905555900400",
            created_time: "2026-06-06 14:30:00",
          },
        ]}
        mapping={{
          full_name: "customer_name_full",
          phone_number: "customer_phone",
          created_time: "__ignore__",
        }}
        setMapping={vi.fn()}
        onBuildPreview={vi.fn()}
      />
    );

    // Kolon eşleştirme sol panelindeki tüm select option'ları
    const mappingLeft = document.querySelector(".excel-mapping-left");
    const optionTexts = within(mappingLeft)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(optionTexts).toContain("Ad Soyad");
    expect(optionTexts).toContain("Telefon");
    expect(optionTexts).not.toContain("Tag");
    expect(optionTexts).not.toContain("Assigned");
    expect(optionTexts).not.toContain("Updated");
  });

  // ff43cef merge'i ile CRM Önizleme "Sistemde Nasıl Görünür?" olarak yeniden adlandırıldı.
  // Satır limiti (eski: 3) kaldırıldı; tüm örnek satırlar gösterilir.
  it("shows system preview with mapped column data", () => {
    render(
      <ExcelImportModal
        {...baseProps}
        step="mapping"
        columns={["full_name", "phone_number"]}
        sampleRows={[
          { full_name: "Ali Şahin", phone_number: "1" },
          { full_name: "Ayşe Demir", phone_number: "2" },
        ]}
        mapping={{ full_name: "customer_name_full", phone_number: "customer_phone" }}
        setMapping={vi.fn()}
        onBuildPreview={vi.fn()}
      />
    );

    // Yeni önizleme etiketi
    expect(screen.getByText("Sistemde Nasıl Görünür?")).toBeInTheDocument();

    // Eşleştirilmiş veriler sistem tablosunda görünmeli
    const systemTable = document.querySelector(".excel-mapping-preview-table--system");
    expect(within(systemTable).getByText("Ali Şahin")).toBeInTheDocument();
    expect(within(systemTable).getByText("Ayşe Demir")).toBeInTheDocument();
  });
});

describe("ExcelImportModal distribution plan", () => {
  it("shows remaining selected OK rows while planning distribution", async () => {
    const user = userEvent.setup();

    render(
      <ExcelImportModal
        {...baseProps}
        rows={[
          {
            _id: "row-1",
            _status: "ok",
            Ad: "Ali",
            Soyad: "Şahin",
            Telefon: "+905555900400",
            Source: "excel",
          },
        ]}
      />
    );

    await user.click(screen.getByRole("checkbox"));

    // ff43cef ile format: "OK: X · Plan: Y · Kalan: Z"
    const summary = document.querySelector(".excel-distribution-summary");
    expect(summary).toHaveTextContent("OK: 1");
    expect(summary).toHaveTextContent("Plan: 0");
    expect(summary).toHaveTextContent("Kalan: 1");

    const distributionPanel = screen.getByText("Dağıtım Planı").closest(".excel-distribution-panel");
    await user.selectOptions(within(distributionPanel).getByRole("combobox"), "1");
    await user.type(within(distributionPanel).getByPlaceholderText("Adet"), "1");

    expect(summary).toHaveTextContent("Plan: 1");
    expect(summary).toHaveTextContent("Kalan: 0");
  });

  it("blocks distribution when any DB duplicate row exists", async () => {
    const user = userEvent.setup();
    const setRows = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <ExcelImportModal
        {...baseProps}
        setRows={setRows}
        rows={[
          {
            _id: "row-ok",
            _status: "ok",
            Ad: "Ali",
            Telefon: "+905555900400",
            Source: "excel",
          },
          {
            _id: "row-db",
            _status: "duplicate_in_db",
            _reason: "duplicate_in_db",
            Ad: "Ayşe",
            Telefon: "+905551112233",
            Source: "excel",
          },
        ]}
      />
    );

    const rowCheckboxes = screen.getAllByRole("checkbox");
    await user.click(rowCheckboxes[0]);

    const distributionPanel = screen.getByText("Dağıtım Planı").closest(".excel-distribution-panel");
    await user.selectOptions(within(distributionPanel).getByRole("combobox"), "1");
    await user.type(within(distributionPanel).getByPlaceholderText("Adet"), "1");
    // ff43cef ile buton metni "Dağıtımı Uygula" → "Uygula"
    await user.click(within(distributionPanel).getByText("Uygula"));

    // ff43cef ile alert mesajı güncellendi
    expect(alertSpy).toHaveBeenCalledWith(
      "Mükerrer kayıt içeren satırlar varken dağıtım uygulanamaz."
    );
    expect(setRows).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  // ff43cef merge'i ile _unmatchedProducts özelliği kaldırıldı.
  // Bunun yerine: satır durum badge'larinin doğru render edildiği test edilir.
  it("shows status badge for ok rows", () => {
    render(
      <ExcelImportModal
        {...baseProps}
        rows={[
          {
            _id: "row-1",
            _status: "ok",
            Ad: "Ali",
            Telefon: "+905555900400",
            Source: "excel",
          },
          {
            _id: "row-2",
            _status: "duplicate_in_db",
            Ad: "Ayşe",
            Telefon: "+905551112233",
            Source: "excel",
          },
        ]}
      />
    );

    expect(screen.getByText("✓ OK")).toBeInTheDocument();
    expect(screen.getByText("⚠ Mükerrer Kayıt")).toBeInTheDocument();
  });
});
