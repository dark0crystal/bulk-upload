import io
from PIL import Image
from rembg import remove
from django.core.files.base import ContentFile


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
    background = Image.new('RGB', (target_width, target_height), "#ecf7fb")
    
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