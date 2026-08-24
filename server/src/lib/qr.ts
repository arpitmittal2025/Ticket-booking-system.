import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.QR_SECRET || 'qrsecret';

export async function generateTicketQR(reference: string, showId: string, seatIds: string[]): Promise<Buffer> {
  // Sign the payload so gate scanners can verify offline
  const payload = jwt.sign({ ref: reference, showId, seats: seatIds }, QR_SECRET, { noTimestamp: true });
  
  // Generate PNG buffer
  return QRCode.toBuffer(payload, { width: 400, margin: 2 });
}
