import { Spiraler, SpiralRing, spiralOut } from '../pattern.js';

export class AndroidSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }
  foregroundService() {
    return spiralOut(this, {});
  }
}
