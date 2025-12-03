import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  if (baseUrl) {
    console.log('[tRPC Client] Using base URL:', baseUrl);
    return baseUrl;
  }

  console.error('[tRPC Client] EXPO_PUBLIC_RORK_API_BASE_URL is not set');
  console.error('[tRPC Client] Available env vars:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')));
  
  throw new Error(
    "Backend URL not available. Make sure the app is started with 'bun start' or 'bunx rork start'. The EXPO_PUBLIC_RORK_API_BASE_URL environment variable is required."
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});
