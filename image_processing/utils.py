import io
from PIL import Image
from rembg import remove
from django.core.files.base import ContentFile


def remove_background(image_file):
    """
    Remove background from an uploaded image using rembg library.
    Returns a ContentFile with the processed image.
    """
    # Read the uploaded image
    image_data = image_file.read()
    
    # Remove background using rembg
    output_data = remove(image_data)
    
    # Convert to PIL Image for further processing if needed
    output_image = Image.open(io.BytesIO(output_data))
    
    # Convert to RGBA if not already (to preserve transparency)
    if output_image.mode != 'RGBA':
        output_image = output_image.convert('RGBA')
    
    # Save to BytesIO buffer
    buffer = io.BytesIO()
    output_image.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    
    # Create ContentFile for Django
    processed_file = ContentFile(
        buffer.read(),
        name=f"processed_{image_file.name.split('.')[0]}.png"
    )
    
    return processed_file