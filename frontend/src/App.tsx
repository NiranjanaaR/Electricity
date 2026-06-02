import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import WatchlistPage from "./pages/WatchlistPage";
import DashboardPage from "./pages/DashboardPage";
import StockPage from "./pages/StockPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="stock/:ticker" element={<StockPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
