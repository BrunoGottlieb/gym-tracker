"""Export the five shared catalog animation pairs, preserving square framing."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NAMES = ('lat-pulldown', 'alternating-curl', 'reverse-fly', 'hammer-curl', 'machine-triceps')
for name in NAMES:
    sheet = Image.open(ROOT / 'assets/catalog-motion-batch1' / f'{name}.png').convert('RGB')
    half = sheet.width // 2
    assert sheet.width == sheet.height * 2
    for position in (1, 2):
        frame = sheet.crop(((position - 1) * half, 0, position * half, half))
        frame.resize((800, 800), Image.Resampling.LANCZOS).save(
            ROOT / 'public/images/motion' / f'{name}-{position}.webp', quality=88, method=6)
    print(f'{name}: exported both frames')
