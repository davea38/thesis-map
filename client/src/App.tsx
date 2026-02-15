import { Routes, Route, Link, Outlet } from "react-router-dom";
import { SaveIndicator } from "@/components/save-indicator";
import { LandingPage } from "@/pages/landing-page";
import { MapView } from "@/pages/map-view";

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <Link to="/" className="text-sm font-semibold">
          Thesis Map
        </Link>
        <SaveIndicator />
      </header>
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map/:id" element={<MapView />} />
      </Route>
    </Routes>
  );
}

export default App;
