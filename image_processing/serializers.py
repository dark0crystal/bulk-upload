from rest_framework import serializers


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    
    def validate_image(self, value):
        # Validate file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
        
        # Validate file format
        allowed_formats = ['JPEG', 'JPG', 'PNG', 'WEBP']
        if value.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            raise serializers.ValidationError(
                f"Unsupported image format. Allowed formats: {', '.join(allowed_formats)}"
            )
        
        return value


class ProductSearchSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=200)
    num_images = serializers.IntegerField(min_value=1, max_value=10, default=3)
    
    def validate_product_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product name cannot be empty.")
        return value.strip()


class CartonDuplicationSerializer(serializers.Serializer):
    image = serializers.ImageField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)
    items_per_row = serializers.IntegerField(min_value=3, max_value=4, required=False)
    
    def validate_image(self, value):
        # Validate file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
        
        # Validate file format
        allowed_formats = ['JPEG', 'JPG', 'PNG', 'WEBP']
        if value.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            raise serializers.ValidationError(
                f"Unsupported image format. Allowed formats: {', '.join(allowed_formats)}"
            )
        
        return value
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        if value > 20:
            raise serializers.ValidationError("Maximum quantity is 20 items.")
        return value
    
    def validate_items_per_row(self, value):
        if value is not None and value not in [3, 4]:
            raise serializers.ValidationError("Items per row must be either 3 or 4.")
        return value