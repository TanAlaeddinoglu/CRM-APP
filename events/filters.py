import django_filters as df

from events.models import Appointment


class AppointmentFilter(df.FilterSet):
    status = df.CharFilter(field_name="status", lookup_expr="icontains")
    customerId = df.CharFilter(field_name="customer_id", lookup_expr="exact")
    product = df.CharFilter(field_name="product_id", lookup_expr="exact")
    appointmentType = df.CharFilter(field_name="appointment_type", lookup_expr="exact")
    dateFrom = df.DateFilter(field_name="scheduled_for", lookup_expr="date__gte")
    dateTo = df.DateFilter(field_name="scheduled_for", lookup_expr="date__lte")

    class Meta:
        model = Appointment
        fields = [
            "status",
            "customerId",
            "product",
            "appointmentType",
            "dateFrom",
            "dateTo",
        ]
