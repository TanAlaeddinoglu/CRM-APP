import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AppointmentCalendar from "../../src/components/AppointmentCalendar.jsx";
import { getAppointments } from "../../src/services/appointment";

const fullCalendarState = vi.hoisted(() => ({
  activeStart: new Date("2026-05-01T00:00:00"),
  activeEnd: new Date("2026-06-01T00:00:00"),
}));

vi.mock("@fullcalendar/react", async () => {
  const React = await import("react");

  return {
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        getApi: () => ({
          view: { type: "timeGridWeek" },
          getDate: () => fullCalendarState.activeStart,
          gotoDate: vi.fn(),
          changeView: vi.fn(),
        }),
      }));

      React.useEffect(() => {
        props.datesSet?.({
          view: {
            type: "timeGridWeek",
            activeStart: fullCalendarState.activeStart,
            activeEnd: fullCalendarState.activeEnd,
            calendar: {
              getDate: () => fullCalendarState.activeStart,
            },
          },
        });
      }, [props]);

      return (
        <div data-testid="full-calendar">
          {props.events.map((event) => (
            <div key={event.id}>{event.title}</div>
          ))}
        </div>
      );
    }),
  };
});

vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {} }));
vi.mock("@fullcalendar/list", () => ({ default: {} }));
vi.mock("@fullcalendar/core/locales/tr", () => ({ default: {} }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "admin@example.com" } }),
}));

vi.mock("../../src/services/appointment", () => ({
  getAppointments: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}));

vi.mock("../../src/components/AppointmentDetailModal", () => ({
  default: () => null,
}));

vi.mock("../../src/components/customer/events/EventModal.jsx", () => ({
  default: () => null,
}));

vi.mock("../../src/components/export/ExportActionButton.jsx", () => ({
  default: () => <button type="button">Export</button>,
}));

function pagedResponse({ count, results }) {
  return Promise.resolve({
    data: {
      count,
      results,
    },
  });
}

describe("AppointmentCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fullCalendarState.activeStart = new Date("2026-05-01T00:00:00");
    fullCalendarState.activeEnd = new Date("2026-06-01T00:00:00");
  });

  it("loads appointments by visible date range instead of requesting page_size 1000", async () => {
    getAppointments.mockResolvedValueOnce({
      data: {
        count: 0,
        results: [],
      },
    });

    render(<AppointmentCalendar />);

    await waitFor(() => {
      expect(getAppointments).toHaveBeenCalledWith({
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        page: 1,
        page_size: 100,
      });
    });

    expect(getAppointments).not.toHaveBeenCalledWith(
      expect.objectContaining({ page_size: 1000 })
    );
  });

  it("fetches every API page for the current calendar range", async () => {
    getAppointments
      .mockReturnValueOnce(
        pagedResponse({
          count: 201,
          results: [
            {
              id: 1,
              customer: "Ayse",
              name: "Kontrol",
              scheduled_for: "2026-05-05T10:00:00",
              appointment_type: "muayene",
              status: "beklemede",
            },
          ],
        })
      )
      .mockReturnValueOnce(
        pagedResponse({
          count: 201,
          results: [
            {
              id: 2,
              customer: "Mehmet",
              name: "Tedavi",
              scheduled_for: "2026-05-06T11:00:00",
              appointment_type: "muayene",
              status: "satis",
            },
          ],
        })
      )
      .mockReturnValueOnce(
        pagedResponse({
          count: 201,
          results: [
            {
              id: 3,
              customer: "Zeynep",
              name: "Planlama",
              scheduled_for: "2026-05-07T12:00:00",
              appointment_type: "muayene",
              status: "olumsuz",
            },
          ],
        })
      );

    render(<AppointmentCalendar />);

    await waitFor(() => {
      expect(getAppointments).toHaveBeenCalledTimes(3);
    });

    expect(getAppointments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 1, page_size: 100 })
    );
    expect(getAppointments).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, page_size: 100 })
    );
    expect(getAppointments).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ page: 3, page_size: 100 })
    );

    await waitFor(() => {
      expect(screen.getByText("Ayse • Kontrol")).toBeInTheDocument();
      expect(screen.getByText("Mehmet • Tedavi")).toBeInTheDocument();
      expect(screen.getByText("Zeynep • Planlama")).toBeInTheDocument();
    });
  });

  it("keeps the date range filter when loading reminders", async () => {
    getAppointments.mockResolvedValue({
      data: {
        count: 0,
        results: [],
      },
    });

    render(<AppointmentCalendar />);

    await waitFor(() => {
      expect(getAppointments).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Hatırlatıcı" }));

    await waitFor(() => {
      expect(getAppointments).toHaveBeenLastCalledWith({
        appointmentType: "hatirlatma",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        page: 1,
        page_size: 100,
      });
    });
  });
});
