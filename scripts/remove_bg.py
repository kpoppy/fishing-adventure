import sys
import math
from PIL import Image

def get_color_distance(c1, c2):
    """Calculate Euclidean distance between two RGB/RGBA colors."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])))

def is_background_candidate(color, bg_seeds, tolerance):
    """Check if color matches any of the background seeds or is a common checkerboard gray."""
    r, g, b, a = color
    
    # 1. Matches user-defined background seeds
    for seed in bg_seeds:
        if get_color_distance(color, seed) < tolerance:
            return True
            
    # 2. Hardcoded common AI checkerboard grays (white and light gray variants)
    # Most common are (255,255,255), (204,204,204), (192,192,192), (128,128,128)
    is_pure_gray = abs(r-g) < 4 and abs(g-b) < 4
    if is_pure_gray:
        if r > 180: # Light grays/Whites
            return True
        if 60 < r < 140: # Mid grays
            return True
            
    return False

def remove_background(input_path, output_path, tolerance=50):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()
        
        # Collect background seeds from corners and edges
        bg_seeds = [pixels[0, 0], pixels[width-1, 0], pixels[0, height-1], pixels[width-1, height-1]]
        
        visited = set()
        to_check = []
        for x in range(width):
            to_check.append((x, 0))
            to_check.append((x, height-1))
        for y in range(height):
            to_check.append((0, y))
            to_check.append((width-1, y))

        queue = list(set(to_check))
        transparent_pixels = set()
        
        while queue:
            x, y = queue.pop(0)
            if (x, y) in visited or x < 0 or x >= width or y < 0 or y >= height:
                continue
            
            visited.add((x, y))
            color = pixels[x, y]
            
            # PROTECT: Don't remove if it has some saturation (not gray) or is very dark
            r, g, b, a = color
            saturation = max(r, g, b) - min(r, g, b)
            
            # Relaxed protection: Allow removing pixels with low saturation (light noise)
            if (saturation > 35) or (r < 30 and g < 30 and b < 30):
                continue

            if is_background_candidate(color, bg_seeds, tolerance):
                transparent_pixels.add((x, y))
                for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    queue.append((x + dx, y + dy))
        
        # Erosion: Clean up edges more aggressively
        final_transparent = set(transparent_pixels)
        for _ in range(2): # 2-pixel erosion for cleaner edges on messy AI images
            current_layer = set()
            for x, y in final_transparent:
                for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        current_layer.add((nx, ny))
            final_transparent.update(current_layer)
        transparent_pixels = final_transparent

        # Autocrop
        min_x, min_y, max_x, max_y = width, height, -1, -1
        new_img = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        new_pixels = new_img.load()
        
        content_found = False
        for y in range(height):
            for x in range(width):
                if (x, y) not in transparent_pixels:
                    new_pixels[x, y] = pixels[x, y]
                    min_x, max_x = min(min_x, x), max(max_x, x)
                    min_y, max_y = min(min_y, y), max(max_y, y)
                    content_found = True
        
        if content_found:
            new_img = new_img.crop((min_x, min_y, max_x + 1, max_y + 1))
                
        new_img.save(output_path, "PNG")
        print(f"Processed: {input_path}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    remove_background(sys.argv[1], sys.argv[2], tol)
