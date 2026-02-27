/**
 * View service
 * Domain service for managing views (lenses on TheStream™)
 */

import { ViewService as GeneratedViewService } from '../../spire/src/services/index.js';
import type { ViewPort } from '../../spire/src/ports/index.js';

export class ViewService extends GeneratedViewService {
  constructor(adaptor: ViewPort) {
    super(adaptor, adaptor);
  }
}
