import { UserButton } from "@clerk/clerk-react";
import { BarChart3, CalendarClock, Home, Settings, Zap } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/plan", label: "Plan", icon: CalendarClock },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">u</span><span>Unhookd</span></div>
        <nav aria-label="Primary navigation">
          {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={18} /><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-user"><UserButton /><span>Account</span></div>
      </aside>
      <main className="app-main"><Outlet /></main>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={19} /><span>{label}</span></NavLink>)}
      </nav>
      <NavLink to="/live" className="mobile-unhook" aria-label="Get unhookd"><Zap size={21} /></NavLink>
    </div>
  );
}
