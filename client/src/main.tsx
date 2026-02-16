import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTRPCClient } from "@/lib/trpc";
import App from "./App";
import "./index.css";

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
