import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazy, Suspense } from "react";
import AuthPage from "./pages/AuthPage";
import UpdateToast from "./components/UpdateToast";
import InstallPrompt from "./components/InstallPrompt";
import "./App.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));

const RouteLoadingFallback = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-main, #0f172a)",
    color: "var(--text-muted, #94a3b8)",
    gap: "1rem",
    fontFamily: "var(--font-sans, system-ui, sans-serif)"
  }}>
    <div style={{
      width: "40px",
      height: "40px",
      border: "3px solid rgba(99, 102, 241, 0.2)",
      borderTopColor: "var(--primary, #6366f1)",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    }} />
    <span style={{ fontSize: "0.875rem", letterSpacing: "0.05em" }}>Loading HabitPulse...</span>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <InstallPrompt />
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<AuthPage />} />

            {/* Protected Habit Tracker Route */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DashboardPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <UpdateToast />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
