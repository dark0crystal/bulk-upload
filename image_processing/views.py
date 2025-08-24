import os
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .serializers import ImageUploadSerializer, ProductSearchSerializer
from .utils import remove_background, download_and_process_images


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


class ProductImageSearchView(APIView):
    """
    API endpoint to search for product images and process them automatically.
    """
    
    def post(self, request):
        serializer = ProductSearchSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product_name = serializer.validated_data['product_name']
            num_images = serializer.validated_data.get('num_images', 3)
            
            # Download and process images
            processed_images = download_and_process_images(product_name, num_images)
            
            if not processed_images:
                return Response({
                    'success': False,
                    'message': 'No images found for the given product name',
                    'processed_images': []
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Save processed images and generate URLs
            results = []
            media_path = os.path.join(settings.MEDIA_ROOT, 'processed')
            os.makedirs(media_path, exist_ok=True)
            
            for img_data in processed_images:
                # Generate unique filename
                unique_filename = f"{uuid.uuid4().hex}_{product_name}_{img_data['index']}.png"
                file_path = os.path.join(media_path, unique_filename)
                
                # Save processed image
                with open(file_path, 'wb') as f:
                    f.write(img_data['processed_image'].read())
                
                # Generate download URL
                download_url = f"{settings.MEDIA_URL}processed/{unique_filename}"
                
                results.append({
                    'index': img_data['index'],
                    'original_url': img_data['original_url'],
                    'processed_image_url': download_url,
                    'filename': unique_filename
                })
            
            return Response({
                'success': True,
                'message': f'Found and processed {len(results)} images for "{product_name}"',
                'product_name': product_name,
                'processed_images': results
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Processing failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
