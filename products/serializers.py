from django.utils.text import slugify
from rest_framework import serializers

from products.models import Product, CustomerProduct


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ["id",
                            "created_at",
                            "created_by",
                            "slug"
                            ]

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)

        product = super().create(validated_data)
        return product

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
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
            raise serializers.ValidationError({"name": ["A product with a similar name already exists."]})
        attrs["slug"] = generated_slug
        return attrs


class CustomerProductsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProduct
        fields = '__all__'
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)

        customer_product = super().create(validated_data)
        return customer_product

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        
        incoming_customer = validated_data.get("customer")
        if not user.is_staff or not user.is_superuser:
            if incoming_customer is not None and incoming_customer != instance.customer:
                raise serializers.ValidationError(
                    {"customer": ["Customer cannot be changed once the assignment is created."]}
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
            queryset = CustomerProduct.objects.filter(product=product, customer=customer)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["This product is already assigned to the customer."]}
                )
        return attrs
