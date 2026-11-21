import 'dotenv/config';
import { JOBS, runJobForAllSchools } from '../src/jobs/runner.js';

const [name, flag] = process.argv.slice(2);
if (!JOBS[name]) {
  console.error(`Usage: node scripts/run-jobs.js <${Object.keys(JOBS).join('|')}> [--dry]`);
  process.exit(1);
}

console.log(JSON.stringify(await runJobForAllSchools(name, { dryRun: flag === '--dry' }), null, 2));
process.exit(0);