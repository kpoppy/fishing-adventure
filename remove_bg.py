from PIL import Image
import sys
import os

def remove_black_background(input_path, output_path, threshold=50):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        count = 0
        for item in datas:
            # Check if pixel is black or very dark
            if item[0] <= threshold and item[1] <= threshold and item[2] <= threshold:
                newData.append((0, 0, 0, 0))  # Replace with transparent
                count += 1
            else:
                newData.append(item)
        
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved to {output_path} (converted {count} pixels to transparent)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_bg.py <input_file> [output_file]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file
    
    remove_black_background(input_file, output_file)
