import app from '../../backend/hono';

export const config = {
  maxDuration: 60,
};

export async function GET(req: Request) {
  return app.fetch(req);
}

export async function POST(req: Request) {
  return app.fetch(req);
}

export async function OPTIONS(req: Request) {
  return app.fetch(req);
}
