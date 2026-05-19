import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CustomerActions from "../../../src/components/customer/CustomerActions.jsx";

describe("CustomerActions", () => {
  it("renders primary customer action buttons", () => {
    render(<CustomerActions customer={{ id: 1 }} />);

    expect(screen.getByText("+ Create Appointment")).toBeInTheDocument();
    expect(screen.getByText("+ Create Agreement")).toBeInTheDocument();
  });
});
