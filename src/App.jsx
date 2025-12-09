import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import LoginSignupPage from "./pages/LoginSignupPage";
import PreferencesPage from "./pages/PreferencesPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import { ExploreSearchPage } from "./pages/ExploreSearchPage";
import Navbar from "./components/Navbar";
import TrailDetails from "./pages/TrailDetails";
import MessagesPage from "./pages/MessagesPage";

// Layout component to wrap pages that should show the Navbar
function DashboardLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

// Wrapper for Explore to handle navigation
function ExploreWrapper() {
  const navigate = useNavigate();
  return (
    <ExploreSearchPage
      onNavigate={(page, id) => {
        if (page === 'trail-detail' && id) {
          navigate(`/trail/${id}`);
        }
      }}
    />
  );
}

// Wrapper for Messages to handle navigation
function MessagesWrapper() {
  const navigate = useNavigate();
  return (
    <MessagesPage
      onNavigate={(page) => {
        if (page === 'explore') navigate('/explore');
      }}
    />
  );
}

export default function App() {
  const [routeAfterAuth, setRouteAfterAuth] = useState(null);
  const currentUserEmail = "user@example.com";

  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN / SIGNUP PAGE (No Navbar) */}
        <Route
          path="/"
          element={
            routeAfterAuth ? (
              <Navigate to={routeAfterAuth} />
            ) : (
              <LoginSignupPage
                onLogin={() => setRouteAfterAuth("/home")}
                onSignup={() => setRouteAfterAuth("/preferences")}
              />
            )
          }
        />

        {/* PAGES WITH NAVBAR - ALL MOVED INSIDE HERE */}
        <Route element={<DashboardLayout />}>
          <Route path="/home" element={<HomePage />} />
          
          <Route path="/explore" element={<ExploreWrapper />} />
          
          {/* Moved INSIDE DashboardLayout */}
          <Route path="/trail/:id" element={<TrailDetails />} />
          
          {/* Moved INSIDE DashboardLayout */}
          <Route path="/messages" element={<MessagesWrapper />} />

          <Route path="/preferences" element={<PreferencesPage />} />
          <Route
            path="/profile/:userId"
            element={<ProfilePage currentUserEmail={currentUserEmail} />}
          />
          <Route
            path="/profile"
            element={<ProfilePage currentUserEmail={currentUserEmail} />}
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}