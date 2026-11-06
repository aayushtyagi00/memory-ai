// Current regression checks replace the baseline script, which expected the old defects to exist.
import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
