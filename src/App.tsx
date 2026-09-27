import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';
import { config } from '@/lib/web3/config';
import '@rainbow-me/rainbowkit/styles.css';
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DeployLocker from "./pages/DeployLocker";
import LockerDetails from "./pages/LockerDetails";
import LockedShowcase from "./pages/LockedShowcase";
import Docs from "./pages/Docs";
import Affiliates from "./pages/Affiliates";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/auth/AuthGuard";
import { captureReferral } from "@/lib/referral";

const queryClient = new QueryClient();

const rainbowDark = darkTheme({ accentColor: '#f5f5f5', accentColorForeground: '#0a0a0a', borderRadius: 'none' });
const rainbowLight = lightTheme({ accentColor: '#000', accentColorForeground: '#fff', borderRadius: 'none' });

// keeps the wallet modal in sync with the site theme
const ThemedRainbowKit = ({ children }: { children: ReactNode }) => {
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider theme={resolvedTheme === 'light' ? rainbowLight : rainbowDark}>
      {children}
    </RainbowKitProvider>
  );
};

// remembers ?ref= from affiliate links on whichever page they land
const ReferralCapture = () => {
  const { search } = useLocation();
  useEffect(() => captureReferral(search), [search]);
  return null;
};

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <ThemedRainbowKit>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ReferralCapture />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/lockers" element={<Dashboard />} />
                <Route path="/deploy" element={<DeployLocker />} />
                <Route path="/locker/:lockerAddress" element={<LockerDetails />} />
                <Route path="/locked/:lockerAddress" element={<LockedShowcase />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/affiliates" element={<Affiliates />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemedRainbowKit>
      </ThemeProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
