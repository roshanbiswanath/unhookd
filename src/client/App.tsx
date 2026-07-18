import { SignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { OnboardingPage } from "./pages/OnboardingPage";
import { TodayPage } from "./pages/TodayPage";
import { LivePage } from "./pages/LivePage";
import { ProgressPage } from "./pages/ProgressPage";
import { PlanPage } from "./pages/PlanPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <>
      <SignedOut>
        <main className="auth-page">
          <section className="auth-intro">
            <span className="brand-mark">u</span>
            <h1>Unhookd</h1>
            <p>Turn the moments that pull you in into short, real-world actions.</p>
          </section>
          <section className="auth-card">
            <SignIn
              routing="hash"
              signUpUrl="#/sign-up"
              appearance={{
                variables: { colorPrimary: "#2d4135", colorText: "#292824", colorBackground: "#ffffff", borderRadius: "0.5rem" },
                elements: { card: "clerk-card", headerTitle: "clerk-title", headerSubtitle: "clerk-subtitle" },
              }}
            />
          </section>
        </main>
      </SignedOut>
      <SignedIn>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppShell />}>
            <Route path="/today" element={<TodayPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </SignedIn>
    </>
  );
}
