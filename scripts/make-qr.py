#!/usr/bin/env python3
"""Generate a QR code PNG for the live Laundristic app.

Usage:
    pip install "qrcode[pil]"
    python scripts/make-qr.py

Writes laundristic-qr.png to the repo root. If the app URL ever changes,
edit URL below and re-run.
"""

from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

URL = "https://gitphantom700.github.io/laundristic-p1/"

# Repo root is the parent of scripts/, so the output lands there regardless
# of the directory the script is run from.
OUTPUT = Path(__file__).resolve().parent.parent / "laundristic-qr.png"


def main() -> None:
    qr = qrcode.QRCode(
        version=None,  # auto-size to the smallest version that fits the URL
        error_correction=ERROR_CORRECT_M,  # ~15% recovery; solid for print + screen
        box_size=11,  # pixels per module — crisp when shared in Slack
        border=4,  # quiet zone, in modules (4 is the spec minimum)
    )
    qr.add_data(URL)
    qr.make(fit=True)

    # Plain black-on-white: highest contrast, fastest to scan.
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(OUTPUT)

    print(f"QR code written to {OUTPUT}")


if __name__ == "__main__":
    main()
