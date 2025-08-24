import io
import os
import requests
from PIL import Image
from rembg import remove
from django.core.files.base import ContentFile
from googleapiclient.discovery import build


def remove_background(image_file):
    """
    Remove background, crop empty spaces, add custom background, and resize to 1080x1080.
    Returns a ContentFile with the processed image.
    """
    # Read the uploaded image
    image_data = image_file.read()
    
    # Remove background using rembg
    output_data = remove(image_data)
    
    # Convert to PIL Image
    output_image = Image.open(io.BytesIO(output_data))
    
    # Convert to RGBA if not already (to preserve transparency)
    if output_image.mode != 'RGBA':
        output_image = output_image.convert('RGBA')
    
    # Crop transparent areas (remove empty spaces)
    # Get bounding box of non-transparent pixels
    bbox = output_image.getbbox()
    
    if bbox:
        # Crop to content only
        cropped_image = output_image.crop(bbox)
    else:
        # If no content found, use original
        cropped_image = output_image
    
    # Target size - 1080x1080 square canvas
    target_width, target_height = 1080, 1080
    
    # Define margins (padding around the PNG object) - optimal spacing
    margin = 250  # 250px margin on all sides for optimal spacing
    
    # Available space for the image after margins
    available_width = target_width - (2 * margin)
    available_height = target_height - (2 * margin)
    
    # Calculate scaling to fit within available space while maintaining aspect ratio
    img_width, img_height = cropped_image.size
    scale = min(available_width / img_width, available_height / img_height)
    
    # Calculate new size
    new_width = int(img_width * scale)
    new_height = int(img_height * scale)
    
    # Resize image
    resized_image = cropped_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create new square canvas with custom background color
    background = Image.new('RGB', (target_width, target_height), "#d8eefa")
    
    # Calculate position to center the image with equal margins on all sides
    x = (target_width - new_width) // 2
    y = (target_height - new_height) // 2
    
    # Paste the resized image onto the background, using alpha channel as mask
    background.paste(resized_image, (x, y), resized_image)
    
    # Save to BytesIO buffer
    buffer = io.BytesIO()
    background.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    
    # Create ContentFile for Django
    processed_file = ContentFile(
        buffer.read(),
        name=f"processed_{image_file.name.split('.')[0]}.png"
    )
    
    return processed_file


def search_product_images(product_name, num_images=3):
    """
    Search for product images using Google Custom Search API.
    Returns a list of image URLs.
    """
    api_key = os.getenv('API_KEY')
    cse_id = os.getenv('GOOGLE_CSE_ID')
    
    if not api_key or not cse_id:
        raise ValueError("Google API key or Custom Search Engine ID not configured")
    
    try:
        service = build("customsearch", "v1", developerKey=api_key)
        
        # Perform the search with image search type
        result = service.cse().list(
            q=product_name,
            cx=cse_id,
            searchType='image',
            num=num_images,
            imgSize='large',
            imgType='photo',
            safe='active'
        ).execute()
        
        # Extract image URLs
        image_urls = []
        if 'items' in result:
            for item in result['items'][:num_images]:
                image_urls.append(item['link'])
        
        return image_urls
        
    except Exception as e:
        raise Exception(f"Google Custom Search API error: {str(e)}")


def download_and_process_images(product_name, num_images=3):
    """
    Search for product images, download them, and process each one.
    Returns a list of processed image ContentFiles with their original URLs.
    """
    try:
        # Search for images
        image_urls = search_product_images(product_name, num_images)
        
        if not image_urls:
            return []
        
        processed_images = []
        
        for i, url in enumerate(image_urls):
            try:
                # Download image
                response = requests.get(url, stream=True, timeout=10)
                response.raise_for_status()
                
                # Check if it's an image by content type
                content_type = response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    continue
                
                # Create ContentFile from downloaded image
                image_content = ContentFile(response.content)
                image_content.name = f"{product_name}_{i+1}.jpg"
                
                # Process the image (remove background)
                processed_image = remove_background(image_content)
                
                processed_images.append({
                    'processed_image': processed_image,
                    'original_url': url,
                    'index': i + 1
                })
                
            except Exception as e:
                # Skip this image and continue with others
                continue
        
        return processed_images
        
    except Exception as e:
        raise Exception(f"Image processing error: {str(e)}")