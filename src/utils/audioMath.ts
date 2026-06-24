/**
 * Convert a linear slider value (0-1) to logarithmic frequency
 * @param linearValue - Linear value between 0 and 1
 * @param minFreq - Minimum frequency in Hz (default: 20)
 * @param maxFreq - Maximum frequency in Hz (default: 20000)
 * @returns Frequency in Hz on logarithmic scale
 */
export function linearToLogFrequency(
  linearValue: number,
  minFreq: number = 20,
  maxFreq: number = 20000
): number {
  const clampedValue = Math.max(0, Math.min(1, linearValue));
  return minFreq * Math.pow(maxFreq / minFreq, clampedValue);
}

/**
 * Convert a logarithmic frequency back to linear slider value (0-1)
 * @param frequency - Frequency in Hz
 * @param minFreq - Minimum frequency in Hz (default: 20)
 * @param maxFreq - Maximum frequency in Hz (default: 20000)
 * @returns Linear value between 0 and 1
 */
export function logFrequencyToLinear(
  frequency: number,
  minFreq: number = 20,
  maxFreq: number = 20000
): number {
  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));
  return Math.log(clampedFreq / minFreq) / Math.log(maxFreq / minFreq);
}

/**
 * Format frequency for display with appropriate precision
 * @param freq - Frequency in Hz
 * @returns Formatted string (e.g., "440.00 Hz", "1.23 kHz")
 */
export function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`;
  }
  return `${freq.toFixed(2)} Hz`;
}
