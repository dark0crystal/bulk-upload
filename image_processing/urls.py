from django.urls import path
from .views import RemoveBackgroundView, ProductImageSearchView, CartonDuplicationView

urlpatterns = [
    path('remove-background/', RemoveBackgroundView.as_view(), name='remove-background'),
    path('search-product-images/', ProductImageSearchView.as_view(), name='search-product-images'),
    path('create-carton/', CartonDuplicationView.as_view(), name='create-carton'),
]