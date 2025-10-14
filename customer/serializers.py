from rest_framework import serializers

from customer.models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    """Serialize customer records including creator metadata."""

    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "archived_at",
            "email_normalized",
            "created_by",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and not validated_data.get("created_by"):
            validated_data["created_by"] = request.user

        return super().create(validated_data)
