#!/usr/bin/env python3
"""Generate 7 DoDo app characters (batch 2: gorilla to panda)"""

from google import genai
from google.genai import types
import os

client = genai.Client(api_key="AIzaSyCfqUI3ifbbltr3kLqcJWGLeUvwvTKCkxw")

STYLE_BASE = """Duolingo-style cute mascot character, slightly surreal and quirky.
The character has a CONFIDENT, SMUG expression (NOT anxious or worried).
Round, chubby body shape with white/cream belly.
Large round black eyes with sparkle highlights.
Pink rosy cheeks.
One playful ahoge (antenna hair/feather).
Thick black outline around the character.
Sticker-style illustration on pure white background.
Giving thumbs up or encouraging pose.
Bright, cheerful colors. Cartoon style."""

characters = [
    {
        "name": "gorilla",
        "prompt": f"""{STYLE_BASE}
A cute chubby GORILLA character as a fitness/workout coach.
Strong but adorable, with muscular arms.
Holding a dumbbell in one hand, giving thumbs up with the other.
Wearing a sweatband on head.
Dark gray/black fur with lighter chest.
Confident, encouraging smile showing determination."""
    },
    {
        "name": "chicken",
        "prompt": f"""{STYLE_BASE}
A cute chubby CHICKEN character as a cooking coach.
Wearing a tall white chef's hat.
Holding a frying pan with one wing.
White/cream feathers with red comb and wattle.
Giving thumbs up with the other wing.
Proud, confident chef expression."""
    },
    {
        "name": "pelican",
        "prompt": f"""{STYLE_BASE}
A cute chubby PELICAN character as a parenting/childcare coach.
Large friendly beak pouch.
Holding a baby bottle or baby rattle.
White and gray feathers with orange beak.
Gentle but confident nurturing expression.
Maybe wearing a small bib or holding a pacifier."""
    },
    {
        "name": "flamingo",
        "prompt": f"""{STYLE_BASE}
A cute chubby FLAMINGO character as a love/romance coach.
Bright PINK feathers all over.
Standing on one leg in classic flamingo pose.
Holding or surrounded by red/pink hearts.
Long curved neck, short cute beak.
Flirty, confident, romantic expression.
Giving a wink or blowing a kiss."""
    },
    {
        "name": "beaver",
        "prompt": f"""{STYLE_BASE}
A cute chubby BEAVER character as an organization/tidying coach.
Brown fur with large flat tail.
Big front teeth visible in confident smile.
Holding a storage box or file folder.
Maybe wearing small glasses.
Organized, efficient, satisfied expression.
Giving thumbs up with one paw."""
    },
    {
        "name": "hummingbird",
        "prompt": f"""{STYLE_BASE}
A cute chubby HUMMINGBIRD character as a time management coach.
Tiny but plump body with iridescent green/blue feathers.
Fast-beating wings shown with motion lines.
Holding or wearing a pocket watch or clock.
Long thin beak.
Energetic, efficient, confident expression.
Quick and productive vibes."""
    },
    {
        "name": "panda",
        "prompt": f"""{STYLE_BASE}
A cute chubby PANDA character as a digital/tech coach.
Classic black and white panda markings.
Round face with black eye patches.
Holding a smartphone or tablet device.
Maybe wearing cute glasses.
Tech-savvy, helpful, confident expression.
Giving thumbs up while showing the device."""
    },
]

output_dir = "/home/takumi-personal/clawd/projects/dodo-app/assets/characters"

for char in characters:
    name = char["name"]
    prompt = char["prompt"]
    output_path = os.path.join(output_dir, f"{name}.png")
    
    print(f"Generating {name}...")
    
    try:
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=prompt,
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
            print(f"✅ Saved: {output_path}")
        else:
            print(f"❌ No image generated for {name}")
    except Exception as e:
        print(f"❌ Error generating {name}: {e}")

print("\n🎉 Batch 2 complete!")
