import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginSignup from "./pages/LoginSignup";
import Home from "./pages/Home";
// import About from "./pages/About";
// import Contact from "./pages/Contact";
// import Explore from "./pages/Explore";
import ProtectedRoute from "./ProtectedRoute";
import { useState } from "react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN / SIGNUP PAGE */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/Home" />
            ) : (
              <LoginSignup setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />

        ALL OTHER PAGES ARE PROTECTED
        <Route
          path="/Home"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/about"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <About />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contact"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Contact />
            </ProtectedRoute>
          }
        />

        <Route
          path="/explore"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Explore />
            </ProtectedRoute>
          }
        /> */}

      </Routes>
    </BrowserRouter>
  );
}
