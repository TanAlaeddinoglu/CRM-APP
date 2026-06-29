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
          full_name: "full_name",
          phone_number: "phone",
          created_time: "unused",
        }}
        setMapping={vi.fn()}
        onBuildPreview={vi.fn()}
      />
    );

    const mappingPanel = screen.getByText("Kolonlar").closest(".excel-mapping-panel");
    const optionTexts = within(mappingPanel)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(optionTexts).toContain("Ad Soyad");
    expect(optionTexts).toContain("Telefon");
    expect(optionTexts).not.toContain("Tag");
    expect(optionTexts).not.toContain("Assigned");
    expect(optionTexts).not.toContain("Updated");
  });

  it("shows a CRM sample preview using only the first three raw rows", () => {
    render(
      <ExcelImportModal
        {...baseProps}
        step="mapping"
        columns={["full_name", "phone_number"]}
        sampleRows={[
          { full_name: "Ali Şahin", phone_number: "1" },
          { full_name: "Ayşe Demir", phone_number: "2" },
          { full_name: "Mehmet Can Yılmaz", phone_number: "3" },
          { full_name: "Ece Kaya", phone_number: "4" },
        ]}
        mapping={{ full_name: "full_name", phone_number: "phone" }}
        setMapping={vi.fn()}
        onBuildPreview={vi.fn()}
      />
    );

    const crmPreview = screen.getByText("CRM Önizleme").closest(".excel-crm-preview");

    expect(within(crmPreview).getByText("Ali")).toBeInTheDocument();
    expect(within(crmPreview).getByText("Şahin")).toBeInTheDocument();
    expect(within(crmPreview).getByText("Mehmet")).toBeInTheDocument();
    expect(within(crmPreview).getByText("Can Yılmaz")).toBeInTheDocument();
    expect(within(crmPreview).queryByText("Ece")).not.toBeInTheDocument();
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

    expect(screen.getByText(/Seçili OK: 1/)).toHaveTextContent("Plan: 0");
    expect(screen.getByText(/Seçili OK: 1/)).toHaveTextContent("Kalan: 1");

    const distributionPanel = screen.getByText("Dağıtım Planı").closest(".excel-distribution-panel");
    await user.selectOptions(within(distributionPanel).getByRole("combobox"), "1");
    await user.type(within(distributionPanel).getByPlaceholderText("Adet"), "1");

    expect(screen.getByText(/Seçili OK: 1/)).toHaveTextContent("Plan: 1");
    expect(screen.getByText(/Seçili OK: 1/)).toHaveTextContent("Kalan: 0");
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
    await user.click(within(distributionPanel).getByText("Dağıtımı Uygula"));

    expect(alertSpy).toHaveBeenCalledWith(
      "DB duplicate satırlar varken dağıtım uygulanamaz. Önce DB duplicate satırları düzelt veya sil."
    );
    expect(setRows).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("shows unmatched product warnings on preview rows", () => {
    render(
      <ExcelImportModal
        {...baseProps}
        rows={[
          {
            _id: "row-1",
            _status: "ok",
            Ad: "Ali",
            Telefon: "+905555900400",
            Products: "bilinmeyen ürün",
            _unmatchedProducts: ["bilinmeyen ürün"],
            Source: "excel",
          },
        ]}
      />
    );

    expect(screen.getByText("Eşleşmeyen: bilinmeyen ürün")).toBeInTheDocument();
  });
});
