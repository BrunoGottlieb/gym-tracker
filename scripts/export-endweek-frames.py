"""Split generated pose pairs and align their stationary machine/body landmarks."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
# Translation of frame two in an 800 px canvas, measured on stationary landmarks.
OFFSETS = {
    'crossover': (3, 1), 'military-situp': (65, 0), 'decline-situp': (10, 0),
    'front-plank': (0, 0), 'cable-row': (-3, 0), 'cable-curl': (34, 0), 'cable-lateral-raise': (0, 0),
}

for name, (dx, dy) in OFFSETS.items():
    sheet = Image.open(ROOT / 'assets' / 'endweek-motion' / f'{name}.png').convert('RGB')
    half = sheet.width // 2
    assert sheet.width == 2 * sheet.height
    for position in (1, 2):
        frame = sheet.crop(((position - 1) * half, 0, position * half, half)).resize((800, 800), Image.Resampling.LANCZOS)
        if name == 'military-situp':
            # Shared extra canvas keeps both soles inside the aligned frames.
            frame = ImageOps.expand(frame, border=50, fill=frame.getpixel((0, 0)))
        size = frame.width
        if position == 2:
            aligned = frame.copy()
            if dx > 0:
                aligned.paste(frame.crop((0, 0, 1, size)).resize((dx, size)), (0, 0))
            elif dx < 0:
                aligned.paste(frame.crop((size - 1, 0, size, size)).resize((-dx, size)), (size + dx, 0))
            if dy < 0:
                aligned.paste(frame.crop((0, size - 1, size, size)).resize((size, -dy)), (0, size + dy))
            if dy > 0:
                aligned.paste(frame.crop((0, 0, size, 1)).resize((size, dy)), (0, 0))
            aligned.paste(frame, (dx, dy))
            frame = aligned
        frame = frame.resize((800, 800), Image.Resampling.LANCZOS)
        frame.save(ROOT / 'public' / 'images' / 'motion' / f'{name}-{position}.webp', quality=88, method=6)
    print(f'{name}: exported with second frame offset ({dx}, {dy})')
