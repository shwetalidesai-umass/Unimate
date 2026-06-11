import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { normalizeGoogleOAuthEnv } from './src/lib/googleOAuthEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
normalizeGoogleOAuthEnv();
