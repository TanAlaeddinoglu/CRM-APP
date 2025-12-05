import django_filters as df
from .models import Customer, CustomerTagHistory, Notes


class CustomerFilter(df.FilterSet):
    """
    Customer Modeli icin status, source, tag ve assigned_to fieldlarini filtreler
    Ornek:
        /customers/?status=active&source=meta&assigned_to=2&tag=8
        /customers/?tag=null&source=manual
    """

    status = df.CharFilter(field_name="status", lookup_expr="icontains")
    source = df.CharFilter(field_name="source", lookup_expr="icontains")
    assigned_to = df.NumberFilter(field_name="assigned_to_id", lookup_expr="exact")

    # ?tag=5  veya ?tag=null  (string "null" geldiğinde NULL filtrele)
    tag = df.CharFilter(method="filter_tag")

    def filter_tag(self, queryset, name, value: str):
        v = value.strip().lower()
        if v == "null":
            return queryset.filter(tag__isnull=True)
        if v != "":
            return queryset.filter(tag_id=value)
        return queryset

    class Meta:
        model = Customer
        fields = ["status", "source", "assigned_to", "tag"]


class TagHistoryFilter(df.FilterSet):
    customerId = df.CharFilter(field_name="customer_id", lookup_expr="exact")

    class Meta:
        model = CustomerTagHistory
        fields = ["customerId"]


class NoteHistoryFilter(df.FilterSet):
    customerId = df.CharFilter(field_name="customer_id", lookup_expr="exact")

    class Meta:
        model = Notes
        fields = ["customerId"]
