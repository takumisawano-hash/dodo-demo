#!/usr/bin/env python3
"""DoDoアプリ キャラクター生成スクリプト"""

from google import genai
from google.genai import types
import os

client = genai.Client(api_key="AIzaSyCfqUI3ifbbltr3kLqcJWGLeUvwvTKCkxw")

STYLE_BASE = """Duolingo-style cute mascot character, slightly surreal and quirky.
MUST have: confident smug expression (NOT anxious or worried), round chubby body shape, 
white/cream colored belly, large round black eyes with sparkle highlights, pink cheeks/blush,
one cute cowlick/ahoge hair tuft on top, thick bold black outline around the character,
sticker-style flat design, pure white background, encouraging pose like thumbs up or cheering.
The character should look proud, confident and slightly smug - like they know they're awesome."""

characters = [
    {
        "name": "polly",
        "prompt": f"""{STYLE_BASE}
A colorful parrot character as a LANGUAGE LEARNING coach.
Vibrant rainbow-colored feathers (red, blue, green, yellow), round chubby parrot body.
Holding a small book in one wing and has speech bubble marks floating nearby.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "owl",
        "prompt": f"""{STYLE_BASE}
A brown owl character as a HABIT BUILDING coach.
Warm brown feathers, round chubby owl body, big expressive eyes.
Holding a small checklist/clipboard with checkmarks in one wing.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "finch",
        "prompt": f"""{STYLE_BASE}
A golden/yellow finch bird character as a MONEY/FINANCE coach.
Bright golden-yellow feathers, small round chubby finch body.
Holding shiny gold coins or a small wallet/piggy bank.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "koala",
        "prompt": f"""{STYLE_BASE}
A gray koala character as a SLEEP/REST coach.
Soft gray fur, round chubby koala body, big fluffy ears.
Holding a small fluffy pillow, with moon and star symbols floating nearby.
Confident smug expression (NOT sleepy), giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "swan",
        "prompt": f"""{STYLE_BASE}
A white swan character as a MENTAL HEALTH/WELLNESS coach.
Elegant white feathers, round chubby swan body, graceful curved neck.
Surrounded by floating hearts and lotus flower symbols.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "eagle",
        "prompt": f"""{STYLE_BASE}
A bald eagle character as a CAREER/BUSINESS coach.
Brown and white feathers, round chubby eagle body, proud stance.
Wearing a small necktie, holding a tiny briefcase.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    },
    {
        "name": "hawk",
        "prompt": f"""{STYLE_BASE}
A hawk character as a STUDY/LEARNING coach.
Brown and tan feathers, round chubby hawk body, sharp but friendly eyes.
Wearing small round glasses, holding a book or notebook.
Confident smug expression, giving thumbs up. Sticker style, white background."""
    }
]

output_dir = "/home/takumi-personal/clawd/projects/dodo-app/assets/characters"

for char in characters:
    output_path = os.path.join(output_dir, f"{char['name']}.png")
    
    if os.path.exists(output_path):
        print(f"⏭️  {char['name']}.png already exists, skipping...")
        continue
    
    print(f"🎨 Generating {char['name']}...")
    
    try:
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=char['prompt'],
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                output_mime_type="image/png"
            )
        )
        
        if response.generated_images:
            image_data = response.generated_images[0].image.image_bytes
            with open(output_path, 'wb') as f:
                f.write(image_data)
            print(f"✅ Saved {char['name']}.png ({len(image_data)} bytes)")
        else:
            print(f"❌ No image generated for {char['name']}")
            
    except Exception as e:
        print(f"❌ Error generating {char['name']}: {e}")

print("\n🎉 Character generation complete!")
