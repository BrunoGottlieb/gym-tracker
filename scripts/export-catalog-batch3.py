"""Export the three shared catalog animation pairs, preserving square framing."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NAMES = ('bent-over-row', 'linear-hack-squat', 'walking-lunge')
for name in NAMES:
    sheet = Image.open(ROOT / 'assets/catalog-motion-batch3' / f'{name}.png').convert('RGB')
    half = sheet.width // 2
    assert sheet.width == sheet.height * 2
    for position in (1, 2):
        frame = sheet.crop(((position - 1) * half, 0, position * half, half))
        frame.resize((800, 800), Image.Resampling.LANCZOS).save(
            ROOT / 'public/images/motion' / f'{name}-{position}.webp', quality=88, method=6)
    print(f'{name}: exported both frames')

# Use a wide blue canvas for Nick's leg-day cover without clipping the machine.
frame = Image.open(ROOT / 'public/images/motion/linear-hack-squat-1.webp').convert('RGB')
cover = Image.new('RGB', (1440, 800))
cover.paste(frame.crop((0, 0, 1, 800)).resize((320, 800)), (0, 0))
cover.paste(frame, (320, 0))
cover.paste(frame.crop((799, 0, 800, 800)).resize((320, 800)), (1120, 0))
cover.save(ROOT / 'public/images/motion/covers/linear-hack-squat.webp', quality=90, method=6)
