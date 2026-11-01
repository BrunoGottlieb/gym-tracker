"""Re-export the existing artwork with fixed equipment aligned between frames.

Only canvas translation is applied; no new artwork or exercise poses are generated.
Offsets are in the final 800 x 800 frame, measured against fixed machine landmarks.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OFFSETS = {'pec-deck': (25, -1), 'parallel-bar-dips': (36, 0)}

for name, (dx, dy) in OFFSETS.items():
    sheet = Image.open(ROOT / 'assets' / 'monday-motion' / f'{name}.png').convert('RGB')
    half = sheet.width // 2
    frame = sheet.crop((half, 0, sheet.width, sheet.height)).resize((800, 800), Image.Resampling.LANCZOS)
    # Extend the original blue edge pixels into the exposed canvas margins.
    aligned = frame.copy()
    if dx > 0:
        aligned.paste(frame.crop((0, 0, 1, 800)).resize((dx, 800)), (0, 0))
    if dy < 0:
        aligned.paste(frame.crop((0, 799, 800, 800)).resize((800, -dy)), (0, 800 + dy))
    aligned.paste(frame, (dx, dy))
    aligned.save(ROOT / 'public' / 'images' / 'motion' / f'{name}-2.webp', quality=88, method=6)
    print(f'{name}: second frame shifted ({dx}, {dy}) px')
