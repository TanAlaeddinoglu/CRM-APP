// src/pages/AppointmentsPage.jsx
import AppointmentCalendar from "../components/AppointmentCalendar";

export default function AppointmentsPage() {
    return (
        <div className="page-content">
            <h1 className="page-title">Appointments</h1>

            <div className="calendar-container">
                <AppointmentCalendar onEventClick={(appointment) => setSelected(appointment)}/>
            </div>
        </div>
    );
}
