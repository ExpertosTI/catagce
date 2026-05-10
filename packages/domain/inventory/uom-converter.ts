export class UomConverter {
  /**
   * Converts a quantity from a source UOM to the base UOM.
   * @param quantity The quantity in the source UOM.
   * @param factor The conversion factor (how many base units are in 1 source unit).
   */
  static toBase(quantity: number, factor: number): number {
    // We use a simple multiplication but in production we should use a library like decimal.js
    // to avoid floating point issues as per the design doc (section 10.3).
    return parseFloat((quantity * factor).toFixed(4));
  }

  /**
   * Converts a quantity from the base UOM to a target UOM.
   * @param baseQuantity The quantity in the base UOM.
   * @param factor The conversion factor of the target UOM.
   */
  static fromBase(baseQuantity: number, factor: number): number {
    if (factor === 0) return 0;
    return parseFloat((baseQuantity / factor).toFixed(4));
  }
}
