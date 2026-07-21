/*
 * SECTION: Barcode normalization & validation
 * WHAT: Canonical EAN-13 storage + alternate keys; reject bad lengths and check digits.
 * HOW: Strip non-digits → accept only retail EAN-8 / UPC-A / EAN-13 (valid check digit)
 *      → pad to 13 → lookup variants. Long codes treated as GS1-128 / logistics (not allowed).
 * INPUT: Raw scanner or typed string
 * OUTPUT: toEan13 / validateRetailBarcode for writes; lookupKeys for .in() queries
 */

/** Keep only digit characters. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * GS1 check digit (EAN-8, UPC-A, EAN-13, GTIN-14).
 * From the right of the data digits (excluding check), weights alternate 3, 1, 3, 1…
 */
export function gs1CheckDigitOk(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 8) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

export type BarcodeFailReason =
  | 'empty'
  | 'wrong_length'
  | 'gs1_128'
  | 'bad_check';

export type BarcodeValidation =
  | { ok: true; ean13: string }
  | { ok: false; reason: BarcodeFailReason };

/**
 * Validate a retail product barcode (pack EAN/UPC only).
 * Rejects GS1-128 / logistics-style long codes and wrong check digits.
 */
export function validateRetailBarcode(raw: string): BarcodeValidation {
  const d = digitsOnly(raw);
  if (!d) return { ok: false, reason: 'empty' };

  // GS1-128 / logistics barcodes are variable-length and often much longer than 13.
  if (d.length > 14) return { ok: false, reason: 'gs1_128' };

  let retail = d;
  // GTIN-14 with leading 0 is EAN-13 + packing indicator 0
  if (d.length === 14) {
    if (!d.startsWith('0') || !gs1CheckDigitOk(d)) {
      return { ok: false, reason: 'gs1_128' };
    }
    retail = d.slice(1);
  }

  if (retail.length !== 8 && retail.length !== 12 && retail.length !== 13) {
    return { ok: false, reason: 'wrong_length' };
  }

  if (!gs1CheckDigitOk(retail)) {
    return { ok: false, reason: 'bad_check' };
  }

  const ean13 = retail.length === 13 ? retail : retail.padStart(13, '0');
  // After padding UPC-A / EAN-8, EAN-13 check digit must still be valid
  if (!gs1CheckDigitOk(ean13)) {
    return { ok: false, reason: 'bad_check' };
  }

  return { ok: true, ean13 };
}

/**
 * Canonical form for Macrio DB: always 13 digits when valid; otherwise null.
 */
export function toEan13(raw: string): string | null {
  const v = validateRetailBarcode(raw);
  return v.ok ? v.ean13 : null;
}

/**
 * Strings to try when looking up a product in DB or matching uniqueness.
 * Always includes the EAN-13 form; if it has a leading zero, also the 12-digit UPC form.
 */
export function lookupKeys(raw: string): string[] {
  const ean13 = toEan13(raw);
  if (!ean13) {
    // Still allow lookup of raw digits when validating separately (scan path uses validated codes)
    const d = digitsOnly(raw);
    if (!d) return [];
    const keys = new Set<string>([d]);
    if (d.length === 13 && d.startsWith('0')) keys.add(d.slice(1));
    if (d.length === 12) keys.add(d.padStart(13, '0'));
    return [...keys];
  }
  const keys = new Set<string>([ean13]);
  if (ean13.startsWith('0')) {
    keys.add(ean13.slice(1));
  }
  return [...keys];
}

/** @deprecated Prefer validateRetailBarcode; kept for call sites that only need a boolean. */
export function isValidBarcodeInput(raw: string): boolean {
  return validateRetailBarcode(raw).ok;
}

/** i18n key suffix for a failed validation reason (under product.*). */
export function barcodeErrorKey(reason: BarcodeFailReason): string {
  switch (reason) {
    case 'empty':
      return 'barcodeInvalid';
    case 'wrong_length':
      return 'barcodeWrongLength';
    case 'gs1_128':
      return 'barcodeGs1128';
    case 'bad_check':
      return 'barcodeBadCheck';
  }
}
