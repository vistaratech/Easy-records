import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 min — cached data used on revisit without refetch
      refetchOnWindowFocus: false,   // don't refetch just because user switched tabs
      retry: 1,                      // fail faster (default is 3)
    },
  },
});
