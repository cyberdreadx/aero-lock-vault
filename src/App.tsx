import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/web3/config';
import '@rainbow-me/rainbowkit/styles.css';
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DeployLocker from "./pages/DeployLocker";
import LockerDetails from "./pages/LockerDetails";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/auth/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme({
        accentColor: '#000',
        accentColorForeground: '#fff',
        borderRadius: 'none',
      })}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/lockers" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/deploy" element={<AuthGuard><DeployLocker /></AuthGuard>} />
              <Route path="/locker/:lockerAddress" element={<AuthGuard><LockerDetails /></AuthGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
