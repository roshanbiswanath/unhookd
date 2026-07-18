import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/geist";
import "./styles.css";
import { App } from "./App";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

const root = ReactDOM.createRoot(document.getElementById("root")!);
if (!publishableKey) {
  root.render(<main className="configuration"><span className="brand-mark">u</span><h1>Unhookd needs Clerk configuration</h1><p>Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to the environment before starting the app.</p></main>);
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter><App /></BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    </React.StrictMode>,
  );
}
