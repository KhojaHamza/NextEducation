import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data fetched less than 30 s ago is not fetched again
      refetchOnWindowFocus: false,
      // Retrying a 400, 403 or 404 changes nothing: only retry network and server errors
      retry: (count, error) => (error.status === 0 || error.status >= 500 ? count < 2 : false),
    },
  },
});