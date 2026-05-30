"use client";

// Client-mounted admin SPA. This reproduces the former Vite entrypoint
// (apps/ui/src/main.tsx) as a React component instead of a createRoot call, so
// the existing react-router admin runs inside the unified Next.js app under the
// /admin basename. Loaded via next/dynamic with ssr:false (BrowserRouter reads
// window at render). Routes migrate to native Next SSR incrementally.

import * as React from "react";
import * as ReactDOM from "react-dom";
import { StrictMode } from "react";
import { BrowserRouter } from "@/lib/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/App";
import { CompanyProvider } from "@/context/CompanyContext";
import { LiveUpdatesProvider } from "@/context/LiveUpdatesProvider";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { PanelProvider } from "@/context/PanelContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { DialogProvider } from "@/context/DialogContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initPluginBridge } from "@/plugins/bridge-init";
import { PluginLauncherProvider } from "@/plugins/launchers";
import "@mdxeditor/editor/style.css";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function ShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <ToastProvider>
        <LiveUpdatesProvider>
          <TooltipProvider>
            <BreadcrumbProvider>
              <SidebarProvider>
                <PanelProvider>
                  <PluginLauncherProvider>
                    <DialogProvider>
                      <CommandPaletteProvider>{children}</CommandPaletteProvider>
                    </DialogProvider>
                  </PluginLauncherProvider>
                </PanelProvider>
              </SidebarProvider>
            </BreadcrumbProvider>
          </TooltipProvider>
        </LiveUpdatesProvider>
      </ToastProvider>
    </CompanyProvider>
  );
}

export function AdminApp() {
  React.useEffect(() => {
    initPluginBridge(React, ReactDOM);
  }, []);

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter basename="/admin">
            <ShellProviders>
              <App />
            </ShellProviders>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

export default AdminApp;
