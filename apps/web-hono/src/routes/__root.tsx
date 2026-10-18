import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@emergency-map/web-ui";

import Header from "../components/header";
import { BottomNav } from "../components/layout/bottom-nav";
import { PrototypeBar } from "../components/layout/prototype-bar";
import appCss from "../index.css?url";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import type { AuthSession } from "@/lib/auth/types";

export interface RouterAppContext {
  queryClient: QueryClient;
  isAuthenticated: boolean;
  session: AuthSession | null;
}

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Public+Sans:wght@400;500;600;700&display=swap";

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "Andes Alerta",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONTS_HREF },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootDocument,
  staleTime: 10 * 60 * 1000, // 10 minutes
  beforeLoad: async () => {
    const session = await getAuthSession();
    return {
      session: session ?? null,
      isAuthenticated: !!session,
    };
  },
});

function RootDocument() {
  const context = Route.useRouteContext();
  const { isAuthenticated, session } = context;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-svh">
          <PrototypeBar />
          <Header
            isAuthenticated={isAuthenticated}
            userName={session?.user?.name ?? ""}
            userEmail={session?.user?.email ?? ""}
          />
          <main className="pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
        <BottomNav isAuthenticated={isAuthenticated} />
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
