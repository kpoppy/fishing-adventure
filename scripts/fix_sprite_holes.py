from PIL import Image, ImageDraw

def fill_transparent_holes(image_path, output_path, fill_color=(60, 60, 60, 255)):
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    # Create a mask for visited pixels
    visited = [[False for _ in range(height)] for _ in range(width)]
    
    # Identify outer transparency using flood fill from edges
    stack = []
    # Add all edge pixels that are transparent to the stack
    for x in range(width):
        for y in [0, height - 1]:
            if pixels[x, y][3] == 0:
                stack.append((x, y))
                visited[x][y] = True
    for y in range(height):
        for x in [0, width - 1]:
            if not visited[x][y] and pixels[x, y][3] == 0:
                stack.append((x, y))
                visited[x][y] = True

    # Flood fill
    while stack:
        cx, cy = stack.pop()
        for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height:
                if not visited[nx][ny] and pixels[nx, ny][3] == 0:
                    visited[nx][ny] = True
                    stack.append((nx, ny))

    # Any transparent pixel (alpha 0) that was NOT visited by the flood fill is an "inner hole"
    for x in range(width):
        for y in range(height):
            if pixels[x, y][3] == 0 and not visited[x][y]:
                pixels[x, y] = fill_color

    img.save(output_path)
    print(f"Processed image saved to: {output_path}")

if __name__ == "__main__":
    target = "/Users/macmini/Documents/codex_project/fishing_adventure/game/assets/custom_player_spritesheet.png"
    output = "/Users/macmini/Documents/codex_project/fishing_adventure/game/assets/custom_player_spritesheet_fixed.png"
    fill_transparent_holes(target, output)
