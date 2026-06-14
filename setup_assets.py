import os
import urllib.request
import urllib.parse

# Define image URLs from Wikimedia Commons
IMAGES = {
    "crocodile.jpg": "https://upload.wikimedia.org/wikipedia/commons/1/19/Nile_Crocodile_%283453104567%29.jpg",
    "alligator.jpg": "https://upload.wikimedia.org/wikipedia/commons/e/e7/American_Alligator_in_Everglades_%2841081534711%29.jpg",
    "caiman.jpg": "https://upload.wikimedia.org/wikipedia/commons/8/86/Spectacled_caiman_in_Costa_Rica_01.jpg",
    "gharial.jpg": "https://upload.wikimedia.org/wikipedia/commons/6/63/Gharial_%28Gavialis_gangeticus%29_female_and_juvenile.jpg",
    "ancient_fossil.jpg": "https://upload.wikimedia.org/wikipedia/commons/d/d3/Plant_pathogenic_damage_on_fossil_leaf_structure_detail%2C_Fothergilla_malloryi_without_scale_01_%28cropped%29.jpg",
    "fossil_teeth.jpg": "https://upload.wikimedia.org/wikipedia/commons/3/35/Crocodylomorpha_teeth_%2836918440692%29.jpg",
    "river.jpg": "https://upload.wikimedia.org/wikipedia/commons/7/79/Tropical_forest_around_the_Capim_River%2C_Brazil_ESA25115272.jpg",
    "polluted_river.jpg": "https://upload.wikimedia.org/wikipedia/commons/5/57/Plastic_trash.JPG"
}

def setup():
    # Create assets directory if not exists
    os.makedirs("assets", exist_ok=True)
    print("Created 'assets' directory.")

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

    for filename, url in IMAGES.items():
        filepath = os.path.join("assets", filename)
        if os.path.exists(filepath):
            print(f"Skipping {filename}, already exists.")
            continue

        # Route through weserv.nl proxy
        proxy_url = f"https://images.weserv.nl/?url={urllib.parse.quote(url)}&w=1000"
        print(f"Downloading {filename} via proxy: {proxy_url}...")
        try:
            req = urllib.request.Request(proxy_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                with open(filepath, 'wb') as f:
                    f.write(response.read())
            print(f"Successfully downloaded {filename}.")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")

if __name__ == "__main__":
    setup()
