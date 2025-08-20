import os
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .serializers import ImageUploadSerializer
from .utils import remove_background


class RemoveBackgroundView(APIView):
    """
    API endpoint to upload an image and remove its background.
    """
    
    def post(self, request):
        serializer = ImageUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get uploaded image
            uploaded_image = serializer.validated_data['image']
            
            # Process image - remove background
            processed_image = remove_background(uploaded_image)
            
            # Generate unique filename
            unique_filename = f"{uuid.uuid4().hex}.png"
            
            # Save processed image to media directory
            media_path = os.path.join(settings.MEDIA_ROOT, 'processed')
            os.makedirs(media_path, exist_ok=True)
            
            file_path = os.path.join(media_path, unique_filename)
            
            with open(file_path, 'wb') as f:
                f.write(processed_image.read())
            
            # Generate download URL
            download_url = f"{settings.MEDIA_URL}processed/{unique_filename}"
            
            return Response({
                'success': True,
                'message': 'Background removed successfully',
                'processed_image_url': download_url,
                'filename': unique_filename
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Processing failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
