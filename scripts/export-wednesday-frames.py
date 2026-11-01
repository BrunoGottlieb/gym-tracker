"""Split generated pose pairs and align their stationary machine/body landmarks."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Translation of frame two in an 800 px canvas, measured on stationary landmarks.
OFFSETS = {
    'lever-squat': (34, 0), 'leg-press': (6, -1), 'leg-extension': (10, 0),
    'leg-curl': (0, 0), 'lying-leg-curl': (0, 0), 'hip-abduction': (0, 0), 'calf-raise': (0, 0),
}

for name, (dx, dy) in OFFSETS.items():
    sheet = Image.open(ROOT / 'assets' / 'wednesday-motion' / f'{name}.png').convert('RGB')
    half = sheet.width // 2
    assert sheet.width == 2 * sheet.height
    for position in (1, 2):
        frame = sheet.crop(((position - 1) * half, 0, position * half, half)).resize((800, 800), Image.Resampling.LANCZOS)
        if position == 2:
            aligned = frame.copy()
            if dx > 0:
                aligned.paste(frame.crop((0, 0, 1, 800)).resize((dx, 800)), (0, 0))
            elif dx < 0:
                aligned.paste(frame.crop((799, 0, 800, 800)).resize((-dx, 800)), (800 + dx, 0))
            if dy < 0:
                aligned.paste(frame.crop((0, 799, 800, 800)).resize((800, -dy)), (0, 800 + dy))
            aligned.paste(frame, (dx, dy))
            frame = aligned
        frame.save(ROOT / 'public' / 'images' / 'motion' / f'{name}-{position}.webp', quality=88, method=6)
    print(f'{name}: exported with second frame offset ({dx}, {dy})')
