import os
import tempfile

import qrcode


class PairingQR:
    def __init__(self):
        self.output_path = os.path.join(
            tempfile.gettempdir(), "time4ttack-fh6-pairing-qr.png"
        )

    def generate(self, pair_url: str) -> str:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=12,
            border=2,
        )
        qr.add_data(pair_url)
        qr.make(fit=True)

        image = qr.make_image(fill_color="#000000", back_color="#ffffff").convert("RGB")
        image.save(self.output_path)
        return self.output_path

    def show(self, pair_url: str) -> str:
        path = self.generate(pair_url)
        try:
            os.startfile(path)
        except Exception as exc:
            print(f"[QR] 無法開啟配對 QR 圖片: {exc}")
        return path
