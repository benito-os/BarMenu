import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";

/**
 * Typed error thrown by apiRequest / getQueryFn for non-2xx responses.
 * Carries the HTTP status so callers (or the global cache handlers below)
 * can branch on it. The `message` is only the response body / status text —
 * no status prefix — so toasts render cleanly.
 */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new HttpError(res.status, text);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * If any query or mutation 401s, the session has expired (or never existed).
 * Redirect to the login page so the user can re-authenticate, rather than
 * leaving the UI in a permanent error state. Skip the redirect if we're
 * already on the login page so we don't loop.
 */
function handleUnauthorized(error: unknown) {
  if (
    error instanceof HttpError &&
    error.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/dashboard-login")
  ) {
    window.location.href = "/dashboard-login";
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
