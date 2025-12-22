from django.utils.text import slugify
from rest_framework import serializers

from customer.models import Customer
from products.models import Product, CustomerProduct


class ProductSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["id", "created_at", "created_by", "slug"]

    def get_created_by(self, obj):
        return obj.created_by.username

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)

        product = super().create(validated_data)
        return product

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            validated_data.setdefault("updated_by", user)
        instance = super().update(instance, validated_data)
        return instance

    def validate(self, attrs):
        product_name = attrs.get("name")
        if not product_name:
            return attrs
        generated_slug = slugify(product_name)
        queryset = Product.objects.filter(slug=generated_slug)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                {"name": ["A product with a similar name already exists."]}
            )
        attrs["slug"] = generated_slug
        return attrs


class CustomerProductsSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    updated_by = serializers.ReadOnlyField(source="updated_by.username")
    customer = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=Customer.objects.all(),
        write_only=True,
    )
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
        write_only=True,
    )
    product_id_read = serializers.IntegerField(source="product.id", read_only=True)
    # product_id_2 = ProductSerializer(many=False, read_only=True, required=False, source="product")

    class Meta:
        model = CustomerProduct
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_customer(self, obj):
        return obj.customer.full_name() if obj.customer else None

    def get_product(self, obj):
        return obj.product.name if obj.product else None

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)

        customer_product = super().create(validated_data)
        return customer_product

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        incoming_customer = validated_data.get("customer")
        if not (user and user.is_staff and user.is_superuser):
            if incoming_customer is not None and incoming_customer != instance.customer:
                raise serializers.ValidationError(
                    {
                        "customer": [
                            "Customer cannot be changed once the assignment is created."
                        ]
                    }
                )
            validated_data.pop("customer", None)

        if user and user.is_authenticated:
            validated_data.setdefault("updated_by", user)
        instance = super().update(instance, validated_data)
        return instance

    def validate(self, attrs):
        product = attrs.get("product") or getattr(self.instance, "product", None)
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)

        if product and customer:
            queryset = CustomerProduct.objects.filter(
                product=product, customer=customer
            )
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"product": ["This product is already assigned to the customer."]}
                )
        return attrs
