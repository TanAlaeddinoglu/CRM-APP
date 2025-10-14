from django.urls import path, include
from .views import CustomerList

urlpatterns = [
    path('', CustomerList.as_view(), name='customer-list'),
]