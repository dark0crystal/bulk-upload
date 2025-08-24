from django.urls import path
from .views import RemoveBackgroundView, ProductImageSearchView

urlpatterns = [
    path('remove-background/', RemoveBackgroundView.as_view(), name='remove-background'),
    path('search-product-images/', ProductImageSearchView.as_view(), name='search-product-images'),
]