/**
 * Pattern Matcher (Heddles)
 *
 * The heddles raise and lower warp threads to create patterns.
 * In our loom, they match spiral patterns against the generator matrix
 * to determine what code to generate.
 */

import { SpiralRing } from '../../warp/index.js';
