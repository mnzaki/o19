import { createServices } from './dist/index.js';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as d from 'drizzle-orm'
import * as schema from './dist/schema.js'

global.d = d
global.db = drizzle('deardiary.db');
global.sc = schema
global.s = createServices(db);

global.l = (p) => p.then(console.log)
