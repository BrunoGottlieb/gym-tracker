"""Extend existing blue backgrounds to wide covers without cropping the athlete.

The 1.8:1 canvas fills the responsive cover with object-fit:cover. Cropping at
1.35–1.55:1 removes only extra side background, preserving the whole illustration.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'images' / 'motion'
OUT = ROOT / 'covers'
OUT.mkdir(exist_ok=True)
for name in ('bench-press', 'assisted-pullup', 'lever-squat'):
    frame = Image.open(ROOT / f'{name}-1.webp').convert('RGB')
    cover = Image.new('RGB', (1440, 800))
    cover.paste(frame.crop((0, 0, 1, 800)).resize((320, 800)), (0, 0))
    cover.paste(frame, (320, 0))
    cover.paste(frame.crop((799, 0, 800, 800)).resize((320, 800)), (1120, 0))
    cover.save(OUT / f'{name}.webp', quality=90, method=6)
    print(f'{name}: full blue cover exported')
