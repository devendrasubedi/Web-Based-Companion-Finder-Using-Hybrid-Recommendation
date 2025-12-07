import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginSignup from "./pages/LoginSignup";
import Preferences from "./pages/Preferences"; 
import HomePage from "./pages/HomePage";
import { useState } from "react";

export default function App() {
  const [routeAfterAuth, setRouteAfterAuth] = useState(null);

  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN / SIGNUP PAGE */}
        <Route
          path="/"
          element={
            routeAfterAuth ? (
              <Navigate to={routeAfterAuth} />
            ) : (
              <LoginSignup
                onLogin={() => setRouteAfterAuth("/home")}
                onSignup={() => setRouteAfterAuth("/preferences")}
              />
            )
          }
        />
        

        {/* HOMEPAGE */}
        <Route path="/home" element={<HomePage />} />

        {/* PREFERENCES (INTEREST SELECTION PAGE) */}
        <Route path="/preferences" element={<Preferences />} />

      </Routes>
    </BrowserRouter>
  );
}
