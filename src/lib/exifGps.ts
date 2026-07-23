// Minimal, dependency-free EXIF GPS reader.
//
// Why this exists: on some Android files (notably Samsung Galaxy), exifr reads the
// GPS IFD and inline byte tags (e.g. GPSAltitudeRef) but returns null for the
// RATIONAL values (GPSLatitude/GPSLongitude) — even with the full file buffer. This
// walks the JPEG APP1 → TIFF → GPS IFD directly and reads the rational bytes itself.
//
// All IFD value offsets are relative to the start of the TIFF header (right after
// the "Exif\0\0" marker), per the EXIF spec.

export interface ExifGpsResult {
  lat: number | null;
  lng: number | null;
  debug: string;
}

interface IfdEntry {
  type: number;
  count: number;
  valueFieldOffset: number; // offset (relative to TIFF start) of the 4-byte value/offset field
}

export function readExifGps(ab: ArrayBuffer): ExifGpsResult {
  const fail = (msg: string): ExifGpsResult => ({ lat: null, lng: null, debug: msg });
  try {
    const dv = new DataView(ab);
    if (dv.byteLength < 4 || dv.getUint16(0) !== 0xffd8) return fail('not-jpeg');

    // ── Walk JPEG segments to find APP1 (0xFFE1) containing "Exif\0\0" ──
    let p = 2;
    let tiff = -1;
    while (p + 4 <= dv.byteLength) {
      const marker = dv.getUint16(p);
      if ((marker & 0xff00) !== 0xff00) break; // not a marker — bail
      if (marker === 0xffd9 || marker === 0xffda) break; // EOI / start of scan
      const segLen = dv.getUint16(p + 2);
      if (segLen < 2) break;
      if (marker === 0xffe1) {
        const e = p + 4;
        // "Exif" = 0x45786966, then 0x0000
        if (e + 6 <= dv.byteLength && dv.getUint32(e) === 0x45786966 && dv.getUint16(e + 4) === 0x0000) {
          tiff = e + 6;
          break;
        }
      }
      p += 2 + segLen;
    }
    if (tiff < 0) return fail('no-exif-app1');

    // ── TIFF header: byte order + IFD0 offset ──
    const bo = dv.getUint16(tiff);
    const le = bo === 0x4949; // 'II' little-endian; 'MM' (0x4D4D) big-endian
    if (!le && bo !== 0x4d4d) return fail('bad-tiff-byteorder');
    const u16 = (rel: number) => dv.getUint16(tiff + rel, le);
    const u32 = (rel: number) => dv.getUint32(tiff + rel, le);

    const readIfd = (ifdRel: number): Record<number, IfdEntry> => {
      const entries: Record<number, IfdEntry> = {};
      if (tiff + ifdRel + 2 > dv.byteLength) return entries;
      const count = u16(ifdRel);
      for (let i = 0; i < count; i++) {
        const eo = ifdRel + 2 + i * 12;
        if (tiff + eo + 12 > dv.byteLength) break;
        const tag = u16(eo);
        const type = u16(eo + 2);
        const cnt = u32(eo + 4);
        entries[tag] = { type, count: cnt, valueFieldOffset: eo + 8 };
      }
      return entries;
    };

    const ifd0Rel = u32(4);
    const ifd0 = readIfd(ifd0Rel);
    const gpsPtr = ifd0[0x8825];
    if (!gpsPtr) return fail('no-gps-ifd-pointer');
    const gpsIfdRel = u32(gpsPtr.valueFieldOffset);
    const gps = readIfd(gpsIfdRel);

    // RATIONAL (type 5) = pairs of uint32 (numerator, denominator). 3 of them for
    // lat/lng (deg, min, sec). >4 bytes so always stored at an offset.
    const readRationals = (entry: IfdEntry | undefined): number[] | null => {
      if (!entry || entry.type !== 5 || entry.count < 1) return null;
      const dataRel = u32(entry.valueFieldOffset);
      const out: number[] = [];
      for (let i = 0; i < entry.count; i++) {
        const base = dataRel + i * 8;
        if (tiff + base + 8 > dv.byteLength) return null;
        const num = u32(base);
        const den = u32(base + 4);
        out.push(den === 0 ? 0 : num / den);
      }
      return out;
    };

    const readAscii = (entry: IfdEntry | undefined): string | undefined => {
      if (!entry || entry.type !== 2 || entry.count < 1) return undefined;
      // <=4 bytes stored inline in the value field, otherwise at an offset
      const rel = entry.count <= 4 ? entry.valueFieldOffset : u32(entry.valueFieldOffset);
      const c = dv.getUint8(tiff + rel);
      return c ? String.fromCharCode(c) : undefined;
    };

    const latParts = readRationals(gps[0x0002]);
    const lngParts = readRationals(gps[0x0004]);
    const latRef = readAscii(gps[0x0001]);
    const lngRef = readAscii(gps[0x0003]);

    const toDecimal = (parts: number[] | null, ref: string | undefined): number | null => {
      if (!parts || parts.length < 1) return null;
      const [deg = 0, min = 0, sec = 0] = parts;
      let dd = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;
      const r = (ref ?? '').trim().toUpperCase();
      if (r === 'S' || r === 'W') dd = -dd;
      return Number.isFinite(dd) ? dd : null;
    };

    const lat = toDecimal(latParts, latRef);
    const lng = toDecimal(lngParts, lngRef);
    const debug =
      `raw lat=${JSON.stringify(latParts)} ref=${latRef} | ` +
      `raw lng=${JSON.stringify(lngParts)} ref=${lngRef} → ${lat},${lng}`;

    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      return { lat: null, lng: null, debug };
    }
    return { lat, lng, debug };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}
