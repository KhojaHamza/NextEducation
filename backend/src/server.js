import 'dotenv/config';
import app from './app.js';
import { startScheduler } from './jobs/scheduler.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
  startScheduler();
});