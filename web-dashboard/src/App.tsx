import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/Auth";
import { useMemo, useState } from "react";

const queryClient = new QueryClient();

function Router() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("smarthome_token")));
  const onAuthed = useMemo(() => () => setAuthed(true), []);

  return (
    <Switch>
      <Route path="/auth">{() => <AuthPage onAuthed={onAuthed} />}</Route>
      <Route path="/">
        {() => (authed ? <Dashboard /> : <AuthPage onAuthed={onAuthed} />)}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
