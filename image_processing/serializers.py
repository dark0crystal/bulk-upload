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