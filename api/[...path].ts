import { handle } from 'hono/vercel';
import app from '../backend/hono';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default handle(app);
