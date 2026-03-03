import os
import sys
from PIL import Image

def process_video_frames(frame_dir, output_path, num_frames=24, resize_factor=0.5):
    frames = sorted([f for f in os.listdir(frame_dir) if f.endswith(".png")])
    if not frames:
        print("No frames found!")
        return

    # Select frames evenly
    step = max(1, len(frames) // num_frames)
    selected_frames = [frames[i] for i in range(0, min(len(frames), num_frames * step), step)][:num_frames]
    
    first_img = Image.open(os.path.join(frame_dir, selected_frames[0]))
    orig_w, orig_h = first_img.size
    frame_w = int(orig_w * resize_factor)
    frame_h = int(orig_h * resize_factor)
    
    # Create master sprite sheet in a grid to avoid WebGL texture size limits
    cols = 6
    rows = (len(selected_frames) + cols - 1) // cols
    sheet = Image.new("RGBA", (frame_w * cols, frame_h * rows), (0, 0, 0, 0))
    
    for i, frame_name in enumerate(selected_frames):
        img = Image.open(os.path.join(frame_dir, frame_name)).convert("RGBA")
        if resize_factor != 1.0:
            img = img.resize((frame_w, frame_h), Image.LANCZOS)
            
        pixels = img.load()
        width, height = img.size
        
        # 精密 Flood Fill: Start ONLY from edges and protect saturated/internal colors
        visited = [[False for _ in range(height)] for _ in range(width)]
        stack = []
        
        # Candidates for background seeds (edge pixels)
        for x in range(width):
            stack.append((x, 0))
            stack.append((x, height - 1))
            visited[x][0] = True
            visited[x][height-1] = True
        for y in range(height):
            stack.append((0, y))
            stack.append((width - 1, y))
            visited[0][y] = True
            visited[width-1][y] = True
            
        bg_color = (0, 0, 0)
        tolerance = 20 # Strict tolerance
        
        to_remove = set()
        while stack:
            cx, cy = stack.pop()
            c = pixels[cx, cy]
            
            # Distance from pure black
            dist = sum(abs(c[j] - bg_color[j]) for j in range(3))
            saturation = max(c[:3]) - min(c[:3])
            
            # Is it background? (Very dark AND very low saturation)
            if dist < tolerance and saturation < 15:
                to_remove.add((cx, cy))
                for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                        visited[nx][ny] = True
                        stack.append((nx, ny))
        
        # Apply transparency to identified background pixels only
        for x, y in to_remove:
            pixels[x, y] = (0, 0, 0, 0)
        
        # Calculate grid position
        col = i % cols
        row = i // cols
        sheet.paste(img, (col * frame_w, row * frame_h))
        print(f"Processed frame {i+1}/{len(selected_frames)}: {frame_name} (Resized to {frame_w}x{frame_h})")

    sheet.save(output_path, optimize=True)
    print(f"Sprite sheet saved to: {output_path}")
    print(f"Frame dimensions: {frame_w}x{frame_h}")
    print(f"Sheet dimensions: {sheet.size}")
    print(f"Total frames: {len(selected_frames)}")

if __name__ == "__main__":
    process_video_frames("/tmp/grok_frames", "/Users/macmini/Documents/codex_project/fishing_adventure/game/assets/trading_boat_hq.png", resize_factor=0.4)
