// Compresión de imágenes y lectura de la fecha original (EXIF DateTimeOriginal).

export async function compressImage(blob: Blob, maxSide = 1280, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se ha podido leer la imagen.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se ha podido capturar la foto.'))), 'image/jpeg', 0.85),
  );
}

/** Devuelve la fecha EXIF DateTimeOriginal de un JPEG en ISO, o null. */
export async function readExifDate(file: Blob): Promise<string | null> {
  try {
    const buf = new DataView(await file.slice(0, 128 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off < buf.byteLength - 4) {
      const marker = buf.getUint16(off);
      const size = buf.getUint16(off + 2);
      if (marker === 0xffe1 && buf.getUint32(off + 4) === 0x45786966) return parseTiff(buf, off + 10);
      off += 2 + size;
    }
  } catch {
    /* imagen sin EXIF o formato no compatible */
  }
  return null;
}

function parseTiff(v: DataView, start: number): string | null {
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, le);
  const u32 = (o: number) => v.getUint32(start + o, le);
  const readIfd = (ifd: number, tag: number): number | null => {
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (u16(e) === tag) return u32(e + 8);
    }
    return null;
  };
  const ifd0 = u32(4);
  const exif = readIfd(ifd0, 0x8769);
  const at = (exif !== null ? readIfd(exif, 0x9003) : null) ?? readIfd(ifd0, 0x0132);
  if (at === null) return null;
  let s = '';
  for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(start + at + i));
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
