import django_filters as df

from events.models import Appointment


class AppointmentFilter(df.FilterSet):
    status = df.CharFilter(field_name="status", lookup_expr="icontains")
    excludeStatus = df.CharFilter(method="filter_exclude_status")
    customerId = df.CharFilter(field_name="customer_id", lookup_expr="exact")
    product = df.CharFilter(field_name="product_id", lookup_expr="exact")
    appointmentType = df.CharFilter(field_name="appointment_type", lookup_expr="exact")
    excludeAppointmentType = df.CharFilter(method="filter_exclude_appointment_type")
    dateFrom = df.DateFilter(field_name="scheduled_for", lookup_expr="date__gte")
    dateTo = df.DateFilter(field_name="scheduled_for", lookup_expr="date__lte")

    def filter_exclude_status(self, queryset, name, value):
        statuses = [item.strip() for item in str(value).split(",") if item.strip()]
        if not statuses:
            return queryset
        return queryset.exclude(status__in=statuses)

    def filter_exclude_appointment_type(self, queryset, name, value):
        types = [item.strip() for item in str(value).split(",") if item.strip()]
        if not types:
            return queryset
        return queryset.exclude(appointment_type__in=types)

    class Meta:
        model = Appointment
        fields = [
            "status",
            "excludeStatus",
            "customerId",
            "product",
            "appointmentType",
            "excludeAppointmentType",
            "dateFrom",
            "dateTo",
        ]
