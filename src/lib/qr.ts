import "server-only";
import QRCode from "qrcode";

/** A QR code as inline SVG, for scanning a UPI link from a phone. Our own input only. */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#172350", light: "#ffffff" } });
}
