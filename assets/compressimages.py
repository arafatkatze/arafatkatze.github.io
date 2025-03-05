import os
from PIL import Image
from shutil import move

# Set the directories
source_dir = '/Users/arafatkhan/Desktop/arafatkatze.github.io/assets/img/art'
old_files_dir = '/Users/arafatkhan/Desktop/arafatkatze.github.io/assets/img/art/oldimages'
compressed_files_dir = source_dir  # if you want to replace the heavy JPEGs in the same directory

# Loop through all JPEG files in the source directory
for filename in os.listdir(source_dir):
    if filename.endswith('.jpeg'):
        # Construct the full file path
        file_path = os.path.join(source_dir, filename)
        
        # Move the heavy JPEGs to the old files directory
        move(file_path, os.path.join(old_files_dir, filename))
        
        # Open the image
        img = Image.open(os.path.join(old_files_dir, filename))
        
        # Compress and save the image with a quality of 85 (you can adjust this)
        # The 'optimize' flag can also help reduce file size
        img.save(os.path.join(compressed_files_dir, filename), 'JPEG', quality=85, optimize=True)

print("Process completed.")
