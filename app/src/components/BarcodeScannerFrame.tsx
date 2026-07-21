/*
 * SECTION: Barcode scanner viewfinder
 * WHAT: Camera with dark mask, clear center rectangle, laser line; double-read confirm.
 * HOW: 1) first decode locks candidate 2) ignore scans for 2s 3) second matching
 *      normalized code calls onConfirmed. Mismatch resets candidate + cooldown.
 * INPUT: onConfirmed(code), optional enabled
 * OUTPUT: Confirmed digit string (raw from scanner; caller normalizes for DB)
 */
import { CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { digitsOnly, validateRetailBarcode } from '../lib/barcode';
import { colors } from '../lib/theme';

const COOLDOWN_MS = 2000;
const WIN_W = Dimensions.get('window').width;
const FRAME_WIDTH = Math.min(280, Math.round(WIN_W * 0.78));
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * 0.57);

type Props = {
  onConfirmed: (code: string) => void;
  /** When false, ignore all scans (e.g. while a lookup is in progress). */
  enabled?: boolean;
};

export function BarcodeScannerFrame({ onConfirmed, enabled = true }: Props) {
  const candidateRef = useRef<string | null>(null);
  const cooldownUntilRef = useRef(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  function pulseLock() {
    setFlash(true);
    setLocked(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 400);
  }

  function resetCandidate(next: string | null) {
    candidateRef.current = next;
    if (next) {
      cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
      pulseLock();
    } else {
      setLocked(false);
      setFlash(false);
    }
  }

  function onScanned({ data }: { data: string }) {
    if (!enabled) return;
    const raw = digitsOnly(data);
    if (!raw) return;
    const v = validateRetailBarcode(raw);
    // Ignore logistics / bad check digit reads entirely
    if (!v.ok) return;
    const norm = v.ean13;
    const now = Date.now();

    // Still in cooldown after first lock: ignore everything.
    if (candidateRef.current && now < cooldownUntilRef.current) {
      return;
    }

    // No candidate yet: lock first read and start 2s cooldown.
    if (!candidateRef.current) {
      resetCandidate(norm);
      return;
    }

    // Cooldown finished: second read must match (normalized).
    const pending = candidateRef.current;
    if (norm === pending) {
      candidateRef.current = null;
      setLocked(false);
      setFlash(false);
      onConfirmed(norm);
      return;
    }

    // Different code: restart confirmation with the new candidate.
    resetCandidate(norm);
  }

  const borderColor = flash ? '#FF3B30' : locked ? colors.primary : '#FFFFFF';

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScanned}
      />
      {/* Dark edges: four panels around the clear rectangle */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.maskRow, styles.maskTop]} />
        <View style={styles.midRow}>
          <View style={styles.maskSide} />
          <View style={[styles.frame, { borderColor }]}>
            <View style={[styles.laser, flash && styles.laserHot]} />
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={[styles.maskRow, styles.maskBottom]} />
      </View>
    </View>
  );
}

const MASK = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject },
  maskRow: { backgroundColor: MASK, width: '100%' },
  maskTop: { flex: 1 },
  maskBottom: { flex: 1 },
  midRow: {
    flexDirection: 'row',
    height: FRAME_HEIGHT,
    alignItems: 'stretch',
  },
  maskSide: { flex: 1, backgroundColor: MASK },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  laser: {
    height: 2,
    marginHorizontal: 8,
    backgroundColor: '#FF3B30',
    opacity: 0.85,
  },
  laserHot: {
    opacity: 1,
    height: 3,
    backgroundColor: '#FF1A1A',
  },
});
