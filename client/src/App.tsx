/** Midnight Editorial design reminder: maintain dark cinematic surfaces and direct navigation. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AnimeCollectionPage from "./pages/AnimeCollection";
import AnimeDetailPage from "./pages/AnimeDetail";
import Home from "./pages/Home";
import MangaArchivePage from "./pages/MangaArchive";
import MangaDetailPage from "./pages/MangaDetail";
import MangaFavoritesPage from "./pages/MangaFavorites";
import MangaDexReaderPage from "./pages/MangaDexReader";
import LibraryPage from "./pages/Library";
import WatchlistPage from "./pages/Watchlist";
import VectorEnginePage from "./pages/VectorEngine";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/anime/:id"} component={AnimeDetailPage} />
      <Route path={"/manga/favorites"} component={MangaFavoritesPage} />
      <Route path={"/reader"} component={MangaDexReaderPage} />
      <Route path={"/manga/:id"} component={MangaDetailPage} />
      <Route path={"/manga"} component={MangaArchivePage} />
      <Route path={"/library"} component={LibraryPage} />
      <Route path={"/watchlist"} component={WatchlistPage} />
      <Route path={"/recommendations"} component={VectorEnginePage} />
      <Route path={"/vector-engine"} component={VectorEnginePage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
