import app from './src/app.js';
import { port } from './src/config/env.js';

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});