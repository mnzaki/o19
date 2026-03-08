import * as sley from './sley/index.js';
import * as heddles from './heddles/index.js';
import * as reed from './reed/index.js';
import type { EntityMetadata, ManagementMetadata } from '../warp/metadata.js';

export interface WorkspaceInfo {
  /** The name of the workspace **/
  name: string;

  /** Type of workspace detected */
  type: 'workspace' | 'package' | 'unknown';

  /** Root directory of the workspace */
  root: string;

  /** loom directory of the workspace */
  loomDir: string;

  /** Path to loom/WARP.ts if found */
  warpPath: string;

  /** loaded warp **/
  warp: Record<string, unknown>;

  /** Current package name if in a package subdirectory */
  currentPackage?: string;
}

export interface Shed {
  methods: reed.Reed['methods'];
  mgmts: reed.Reed['mgmts'];
}

export class Loom {
  shed?: Shed;
  heddles?: heddles.Heddles;
  reed?: reed.Reed;

  constructor(public workspace: WorkspaceInfo) {}

  async buildHeddles(): Promise<heddles.Heddles> {
    const mgmts = await heddles.collectManagements(this.workspace.loomDir);
    const pipeline: any[] = [];
    const methods = heddles.collectMethods({ mgmts }, pipeline);
    const entities = heddles.collectEntities({ mgmts }, pipeline);
    const queries = await heddles.collectQueriesFromDirectory(this.workspace.loomDir);

    // FIXME this should rather be intermediate, and now reed enhancement should be
    // applied and that is what is returned as The Shed that is open
    this.heddles = {
      mgmts,
      methods,
      entities,
      queries: queries.queries,
      errors: queries.errors,
      filesProcessed: queries.filesProcessed
    };

    return this.heddles;
  }

  async openShed(): Promise<Shed> {
    if (!this.heddles) {
      this.heddles = await this.buildHeddles();
    }

    if (!this.reed) {
      this.reed = reed.fromHeddles(this.heddles);
      this.shed = {
        ...this.reed
      };
    }

    if (!this.shed) {
      this.shed = {
        ...this.reed
      };
    }

    return this.shed;
  }
}
