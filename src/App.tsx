import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { GameProvider } from '@/state/game';
import { Shell } from '@/components/shell';
import Welcome from '@/pages/welcome';
import Briefing from '@/pages/briefing';
import Base from '@/pages/base';
import Control from '@/pages/control';
import Review from '@/pages/review';
import Results from '@/pages/results';
import Academy from '@/pages/academy';
import History from '@/pages/history';
import About from '@/pages/about';
import Teacher from '@/pages/teacher';
import JudgeDemo from '@/pages/demo';

const queryClient = new QueryClient();

const inShell = (C: () => ReactNode) => () => (
  <Shell>
    <C />
  </Shell>
);
const P = {
  briefing: inShell(Briefing), control: inShell(Control), review: inShell(Review),
  results: inShell(Results), academy: inShell(Academy), history: inShell(History), about: inShell(About),
  teacher: inShell(Teacher),
};

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Welcome} />
        <Route path="/briefing" component={P.briefing} />
        <Route path="/base" component={Base} />
        <Route path="/demo" component={JudgeDemo} />
        <Route path="/control" component={P.control} />
        <Route path="/review" component={P.review} />
        <Route path="/results" component={P.results} />
        <Route path="/academy" component={P.academy} />
        <Route path="/history" component={P.history} />
        <Route path="/about" component={P.about} />
        <Route path="/teacher" component={P.teacher} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </GameProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
