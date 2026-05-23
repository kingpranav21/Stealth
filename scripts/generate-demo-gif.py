#!/usr/bin/env python3
"""Generate docs/stealth-demo.gif for README. Requires: pip install pillow"""
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Install Pillow: pip3 install pillow")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "stealth-demo.gif"
W, H = 960, 540

SLIDES = [
    ("Stealth", "Open GitHub repos without git clone"),
    ("Open", "Stealth: Open GitHub Repository"),
    ("Browse", "Remote tree · shallow index · lazy folders"),
    ("Edit & push", "Cmd+S → GitHub (no local .git)"),
    ("Disk & AI", "Cache cap · Disk Governor · Stub Guard"),
    ("Install", "VSIX or Open VSX · stealth 0.10+"),
]


def main() -> None:
    frames = []
    for title, sub in SLIDES:
        img = Image.new("RGB", (W, H), (30, 30, 36))
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, W, 6], fill=(45, 212, 191))
        d.text((48, 180), title, fill=(45, 212, 191))
        d.text((48, 260), sub, fill=(220, 220, 225))
        d.text((48, 480), "Cursor / VS Code · Stealth extension", fill=(120, 120, 130))
        frames.append(img)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=1200,
        loop=0,
        optimize=True,
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
