import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { OnboardingPage } from "./pages/OnboardingPage";
import { TodayPage } from "./pages/TodayPage";
import { LivePage } from "./pages/LivePage";
import { ProgressPage } from "./pages/ProgressPage";
import { PlanPage } from "./pages/PlanPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LandingPage } from "./pages/LandingPage";

export function App() {
  return (
    <>
      <SignedOut>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
