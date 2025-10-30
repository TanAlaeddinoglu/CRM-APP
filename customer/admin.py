from django.contrib import admin

from customer.models import Customer, Notes, Tag, CustomerTagHistory


@admin.register(Customer)
class CustomCustomer(admin.ModelAdmin):
    list_display = (
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
        "is_active",
        "created_by",
        "updated_by",

    )
    search_fields = ("customer_name", "customer_surname", "customer_email", "customer_phone")

    def save_model(self, request, obj, form, change):
        if change and "tag" in form.changed_data:
            new_tag = form.cleaned_data.get("tag")
            previous = Customer.objects.get(pk=obj.pk)
            obj.tag = previous.tag
            obj.set_current_tag(new_tag, by=request.user, assign_to=obj.assigned_to)
            obj.tag = new_tag

        if not change and not obj.created_by:
            obj.created_by = request.user

        obj.updated_by = request.user

        if obj.is_active is None:
            obj.is_active = True

        super().save_model(request, obj, form, change)


@admin.register(Tag)
class CustomTag(admin.ModelAdmin):
    pass


@admin.register(CustomerTagHistory)
class CustomCustomerTagHistory(admin.ModelAdmin):
    pass


@admin.register(Notes)
class CustomCustomerNotesHistory(admin.ModelAdmin):
    pass
