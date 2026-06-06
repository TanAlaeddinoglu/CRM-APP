import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ConfirmModal from "../../../src/components/common/ConfirmModal.jsx";

describe("ConfirmModal", () => {
  it("does not render when closed", () => {
    render(<ConfirmModal open={false} />);
    expect(screen.queryByText("Onayla")).not.toBeInTheDocument();
  });

  it("renders content and triggers callbacks", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal
        open
        title="Sil"
        description="Bu kaydi silmek istiyor musunuz?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <div>Ek icerik</div>
      </ConfirmModal>
    );

    expect(screen.getByText("Sil")).toBeInTheDocument();
    expect(screen.getByText("Ek icerik")).toBeInTheDocument();

    await user.click(screen.getByText("Vazgeç"));
    await user.click(screen.getByText("Onayla"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
