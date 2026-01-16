# from customer import serializers
#
#
# class CustomerBulkItemSerializer(serializers.Serializer):
#     row = serializers.IntegerField(required=False)
#
#     # hem snake_case hem camelCase destekleyeceğiz
#     existing_customer_id = serializers.IntegerField(required=False, allow_null=True)
#
#     # CREATE için gerekli ama UPDATE için opsiyonel yapıyoruz
#     customer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
#     customer_surname = serializers.CharField(max_length=100, required=False, allow_blank=True)
#     customer_phone = serializers.CharField(required=False, allow_blank=True)
#     customer_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
#
#     assigned_to = serializers.IntegerField(required=False, allow_null=True)
#     tag = serializers.IntegerField(required=False, allow_null=True)
#     note = serializers.CharField(required=False, allow_null=True, allow_blank=True)
#
#     def to_internal_value(self, data):
#         """
#         Frontend camelCase yollarsa da bozulmasın.
#         """
#         if hasattr(data, "copy"):
#             d = data.copy()
#         else:
#             d = dict(data)
#
#         mapping = {
#             "existingCustomerId": "existing_customer_id",
#             "customerName": "customer_name",
#             "customerSurname": "customer_surname",
#             "customerPhone": "customer_phone",
#             "customerEmail": "customer_email",
#             "assignedTo": "assigned_to",
#         }
#         for src, dst in mapping.items():
#             if src in d and dst not in d:
#                 d[dst] = d[src]
#
#         return super().to_internal_value(d)
#
#     def validate_customer_phone(self, v):
#         if v in (None, ""):
#             return ""
#         phone = _normalize_phone(v)
#         if not phone:
#             raise serializers.ValidationError("Phone must be numeric and 10-13 digits.")
#         return phone
#
#     def validate_customer_email(self, v):
#         if v in ("", None):
#             return None
#         return str(v).strip().lower()
#
#     def validate_note(self, v):
#         if v in ("", None):
#             return None
#         return str(v).strip()
#
#     def validate(self, attrs):
#         """
#         - existing_customer_id varsa: UPDATE modu -> isim/phone zorunlu değil
#         - yoksa: CREATE modu -> name/surname/phone zorunlu
#         """
#         existing_id = attrs.get("existing_customer_id")
#
#         if existing_id:
#             # Update için: en azından bir şey değiştiriyor olmalı
#             if (
#                 "assigned_to" not in attrs
#                 and "tag" not in attrs
#                 and "note" not in attrs
#                 and "customer_email" not in attrs
#             ):
#                 raise serializers.ValidationError(
#                     "Update request must include at least one of: assigned_to, tag, note, customer_email."
#                 )
#             return attrs
#
#         # CREATE
#         name = (attrs.get("customer_name") or "").strip()
#         surname = (attrs.get("customer_surname") or "").strip()
#         phone = (attrs.get("customer_phone") or "").strip()
#
#         if not name:
#             raise serializers.ValidationError({"customer_name": ["This field is required for create."]})
#         if not surname:
#             raise serializers.ValidationError({"customer_surname": ["This field is required for create."]})
#         if not phone:
#             raise serializers.ValidationError({"customer_phone": ["This field is required for create."]})
#
#         return attrs
