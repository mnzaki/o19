import * as heddles from './heddles/index.js';
import * as reed from './reed/index.js';

export interface WorkspaceInfo {
  /** The name of the workspace **/
  name: string;

  /** Type of workspace detected */
  type: 'workspace' | 'package' | 'unknown';

  /** Root directory of the workspace */
  root: string;

  /** loom directory of the workspace */
  loomDir: string;

  /** all loom file paths */
  loomFiles: string[];

  /** Path to loom/WARP.ts if found */
  warpPath: string;

  /** loaded warp **/
  //warp: Record<string, unknown>;

  /** Current package name if in a package subdirectory */
  currentPackage?: string;
}

export interface Shed {
  methods: reed.Reed['methods'];
  entities: reed.Reed['entities'];
  mgmts: reed.Reed['mgmts'];
}

export class Loom {
  _shed?: Shed;
  heddles?: heddles.Heddles;
  reed?: reed.Reed;

  constructor(public workspace: WorkspaceInfo) {}

  async buildHeddles(loomMods: Record<string, any>): Promise<heddles.Heddles> {
    const mgmts = await heddles.collectManagements(this.workspace.loomDir, loomMods);
    const pipeline: any[] = [];
    const methods = heddles.collectMethods({ mgmts }, pipeline);
    const entities = heddles.collectEntities({ mgmts }, pipeline);
    // Query collection disabled for now
    // const queries = await heddles.collectQueriesFromDirectory(this.workspace.loomDir);

    // FIXME this should rather be intermediate, and now reed enhancement should be
    // applied and that is what is returned as The Shed that is open
    this.heddles = {
      mgmts,
      methods,
      entities,
      queries: [],
      errors: [],
      filesProcessed: []
    };

    return this.heddles;
  }

  async openShed(): Promise<Shed> {
    if (!this.heddles) {
      throw new Error('buildHeddles() first!');
    }

    if (!this.reed) {
      this.reed = reed.fromHeddles(this.heddles);
      this._shed = {
        ...this.reed
      };
    }

    if (!this._shed) {
      this._shed = {
        ...this.reed
      };
    }

    return this._shed;
  }

  get shed(): Shed {
    if (!this._shed) throw new Error("The Loom ain't ready!");
    return this._shed;
  }
}
