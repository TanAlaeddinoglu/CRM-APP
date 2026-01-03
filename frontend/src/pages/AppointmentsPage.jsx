// src/pages/AppointmentsPage.jsx
import AppointmentCalendar from "../components/AppointmentCalendar";

export default function AppointmentsPage() {
    return (
        <div className="page-content">
            <div className="calendar-container">
                <AppointmentCalendar onEventClick={(appointment) => setSelected(appointment)}/>
            </div>
        </div>
    );
}
