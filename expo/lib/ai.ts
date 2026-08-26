/** Client helper for the server-side AI endpoints (replaces @rork-ai/toolkit-sdk). */
import { apiPost } from './supabase';

export async function generateText(opts: { messages: { role: 'user' | 'assistant'; content: string }[] }): Promise<string> {
  const res = await apiPost<{ text: string }>('/api/ai/generate-text', { messages: opts.messages });
  return res.text;
}
