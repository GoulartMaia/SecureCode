"""Make the participant QR code for the deployed entry URL and check that it decodes back to it.
Usage: python3 scripts/make_qr.py https://example.org/SecureCode/ out.png
Only the plain entry URL goes in the code: no condition, password, answers or personal data."""
import sys, qrcode, cv2
url, out = sys.argv[1], sys.argv[2]
assert url.startswith("https://") and "?" not in url and "#" not in url, "use the plain https entry URL"
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
qr.add_data(url); qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save(out)
decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread(out))
assert decoded == url, f"decoded {decoded!r}"
print("QR ok:", out, "->", decoded)
