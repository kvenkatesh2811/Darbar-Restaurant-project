import { useEffect, useRef } from "react";
import { ClerkProvider, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Order from "@/pages/Order";
import Admin from "@/pages/Admin";
import SignInPage from "@/pages/SignIn";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// REQUIRED — resolves the publishable key from window.location.hostname so the
// same build serves multiple Clerk custom domains. Do not inline the env var.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod. Do NOT gate on NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths; wouter's setLocation prepends the base — strip it.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f97316",
    colorForeground: "#1c1917",
    colorMutedForeground: "#78716c",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f5f5f4",
    colorInputForeground: "#1c1917",
    colorNeutral: "#e7e5e4",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-stone-900",
    headerSubtitle: "text-stone-500",
    socialButtonsBlockButtonText: "text-stone-700",
    formFieldLabel: "text-stone-700 font-medium",
    footerActionLink: "text-orange-500 hover:text-orange-600 font-medium",
    footerActionText: "text-stone-500",
    dividerText: "text-stone-400",
    identityPreviewEditButton: "text-orange-500",
    formFieldSuccessText: "text-green-600",
    alertText: "text-stone-700",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-stone-200 hover:bg-stone-50",
    formButtonPrimary: "bg-orange-500 hover:bg-orange-600 text-white",
    formFieldInput: "border-stone-200 bg-stone-50 text-stone-900",
    footerAction: "bg-stone-50 border-t border-stone-100",
    dividerLine: "bg-stone-200",
    alert: "bg-orange-50 border-orange-200",
    otpCodeFieldInput: "border-stone-200 text-stone-900",
    formFieldRow: "gap-3",
    main: "gap-6",
  },
};

// Invalidates React Query cache when the signed-in user changes.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/menu" component={Menu} />
          <Route path="/order" component={Order} />
          <Route path="/admin" component={Admin} />
          {/* /sign-in/*? — the /*? wildcard is required; matches bare URL and
              Clerk's OAuth sub-paths (/sign-in/sso-callback, /factor-one…) */}
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      // No sign-up — admin access only; owner signs in via sign-in page
      signUpUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "Admin Sign In",
            subtitle: "Sign in to access the Darbar admin panel",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
