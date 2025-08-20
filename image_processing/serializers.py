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