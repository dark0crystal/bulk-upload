import io
import os
import requests
import math
from PIL import Image
from rembg import remove
from django.core.files.base import ContentFile
from googleapiclient.discovery import build


def crop_transparent_areas(image):
    """
    Aggressively crop all transparent/empty areas from an RGBA image.
    Returns the tightly cropped image with only the actual content.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Get image data as numpy-like array for pixel analysis
    width, height = image.size
    
    # Find the bounding box of non-transparent pixels
    # Using getbbox() which finds the minimal bounding rectangle
    bbox = image.getbbox()
    
    if bbox:
        # Crop to the bounding box (removes all transparent padding)
        cropped = image.crop(bbox)
        
        # Additional step: remove any remaining nearly-transparent pixels at edges
        # This handles cases where background removal left semi-transparent artifacts
        cropped = remove_edge_artifacts(cropped)
        
        return cropped
    else:
        # If no content found, return a minimal transparent image
        return Image.new('RGBA', (1, 1), (0, 0, 0, 0))


def remove_edge_artifacts(image, threshold=30):
    """
    Remove semi-transparent artifacts at the edges of the image.
    Crops pixels with alpha < threshold from edges.
    """
    if image.mode != 'RGBA':
        return image
    
    pixels = image.load()
    width, height = image.size
    
    # Find actual content boundaries (ignoring very transparent pixels)
    left = width
    right = 0
    top = height
    bottom = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > threshold:  # Only consider sufficiently opaque pixels
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)
    
    # If we found content, crop to those boundaries
    if left < right and top < bottom:
        return image.crop((left, top, right + 1, bottom + 1))
    else:
        # If no opaque content found, return minimal image
        return Image.new('RGBA', (1, 1), (0, 0, 0, 0))


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
    
    # Crop transparent areas (remove empty spaces) more aggressively
    cropped_image = crop_transparent_areas(output_image)
    
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
    background = Image.new('RGB', (target_width, target_height), "#eef7fe")
    
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
            imgSize='LARGE',
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


def duplicate_items_for_carton(image_input, quantity, items_per_row=None, canvas_size=(1080, 1080), margin=250):
    """
    Duplicate a single item to show multiple items in a carton arrangement.
    New workflow: Remove background -> Arrange transparent images -> Add background at the end
    
    Args:
        image_input: Either a file path (string) or an uploaded image file
        quantity: Number of items to display
        items_per_row: Number of items per row (3 or 4), auto-calculated if None
        canvas_size: Output canvas dimensions (width, height)
        margin: Padding around the entire arrangement (default 250px from all edges)
        
    Returns:
        ContentFile with the duplicated items arrangement
    """
    if quantity <= 0:
        raise ValueError("Quantity must be greater than 0")
    
    # Step 1: Remove background and get transparent item
    if isinstance(image_input, str):
        # File path - assume it's already processed, so crop it tightly
        single_item = Image.open(image_input).convert('RGBA')
        single_item = crop_transparent_areas(single_item)
    else:
        # Uploaded file - remove background first
        image_data = image_input.read()
        output_data = remove(image_data)
        single_item = Image.open(io.BytesIO(output_data)).convert('RGBA')
        # Crop transparent areas aggressively
        single_item = crop_transparent_areas(single_item)
    
    # Determine items per row
    if items_per_row is None:
        if quantity <= 4:
            items_per_row = quantity
        else:
            items_per_row = 4  # Default to 4 per row for 5+ items
    
    # Validate items_per_row
    if items_per_row not in [3, 4] and quantity > 4:
        items_per_row = 4
    
    # Calculate grid dimensions
    total_rows = math.ceil(quantity / items_per_row)
    
    # Calculate available space for the grid
    canvas_width, canvas_height = canvas_size
    available_width = canvas_width - (2 * margin)
    available_height = canvas_height - (2 * margin)
    
    # Calculate item size to fit the grid
    # X-axis: Zero spacing between items (touching)
    # Y-axis: Overlapping with half-height offset
    horizontal_spacing = 0  # Zero gap horizontally
    
    max_item_width = available_width // items_per_row
    
    # For Y-axis: calculate based on overlapping logic
    # First row gets full height, subsequent rows overlap by half
    if total_rows == 1:
        max_item_height = available_height
    else:
        # Available height = full height of first row + (half heights of remaining rows)
        # available_height = item_height + (total_rows - 1) * (item_height / 2)
        # available_height = item_height * (1 + (total_rows - 1) / 2)
        # available_height = item_height * (total_rows + 1) / 2
        # item_height = available_height * 2 / (total_rows + 1)
        max_item_height = int(available_height * 2 // (total_rows + 1))
    
    # Scale the single item to fit within the calculated max size while maintaining aspect ratio
    item_width, item_height = single_item.size
    scale = min(max_item_width / item_width, max_item_height / item_height)
    
    new_item_width = int(item_width * scale)
    new_item_height = int(item_height * scale)
    
    # Resize the single item
    resized_item = single_item.resize((new_item_width, new_item_height), Image.Resampling.LANCZOS)
    
    # Step 2: Create transparent canvas for arrangement (no background yet)
    output_canvas = Image.new('RGBA', canvas_size, (0, 0, 0, 0))
    
    # Calculate the total grid dimensions with new spacing logic
    total_grid_width = items_per_row * new_item_width  # No horizontal spacing
    
    # For overlapping rows: first row + half-heights of remaining rows
    if total_rows == 1:
        total_grid_height = new_item_height
    else:
        total_grid_height = new_item_height + (total_rows - 1) * (new_item_height // 2)
    
    # Calculate starting position to center the grid
    start_x = (canvas_width - total_grid_width) // 2
    start_y = (canvas_height - total_grid_height) // 2
    
    # Place items on the canvas with new spacing logic
    for i in range(quantity):
        row = i // items_per_row
        col = i % items_per_row
        
        # Calculate X position (no spacing, items touching)
        x = start_x + col * new_item_width
        
        # Calculate Y position (overlapping rows)
        if row == 0:
            y = start_y  # First row at top
        else:
            # Each subsequent row overlaps by half the item height
            y = start_y + row * (new_item_height // 2)
        
        # For the last row, center the remaining items if fewer than items_per_row
        items_in_current_row = min(items_per_row, quantity - row * items_per_row)
        if items_in_current_row < items_per_row:
            # Center the items in the last row
            row_width = items_in_current_row * new_item_width
            row_start_x = (canvas_width - row_width) // 2
            x = row_start_x + col * new_item_width
        
        # Step 3: Paste the transparent item onto the transparent canvas
        output_canvas.paste(resized_item, (x, y), resized_item)
    
    # Step 4: Add background as the final step
    # Create background canvas
    background_canvas = Image.new('RGB', canvas_size, "#eef7fe")
    
    # Paste the arranged transparent items onto the background
    background_canvas.paste(output_canvas, (0, 0), output_canvas)
    
    # Save to BytesIO buffer
    buffer = io.BytesIO()
    background_canvas.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    
    # Create ContentFile for Django
    carton_file = ContentFile(
        buffer.read(),
        name=f"carton_{quantity}_items.png"
    )
    
    return carton_file