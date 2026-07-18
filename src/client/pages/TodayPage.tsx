import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, BellRing, CheckCircle2, Clock3, LoaderCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, urlBase64ToUint8Array } from "../api";
import type { DashboardResponse } from "../types";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TodayPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardResponse>(getToken, "/api/dashboard") });
  const notificationAction = useMutation({ mutationFn: (input: { windowId: string; action: string }) => apiFetch(getToken, "/api/notification-actions", { method: "POST", body: JSON.stringify({ ...input, scheduledFor: new Date().toISOString() }) }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] }) });
  useEffect(() => {
    const action = searchParams.get("notificationAction");
    const windowId = searchParams.get("windowId");
    if (action === "start") navigate(`/live?windowId=${windowId ?? ""}`, { replace: true });
    if (windowId && (action === "good" || action === "snooze")) notificationAction.mutate({ windowId, action });
  }, []);

  const enablePush = useMutation({
    mutationFn: async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are not supported in this browser");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await apiFetch<{ publicKey: string }>(getToken, "/api/push/public-key");
      if (!publicKey) throw new Error("Push is not configured on the server");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      return apiFetch(getToken, "/api/push/subscriptions", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
    },
  });

  if (query.isLoading) return <div className="page-loader"><LoaderCircle className="spin" /><span>Loading today</span></div>;
  if (query.error) return <div className="error-state"><h1>Today is unavailable</h1><p>{query.error.message}</p><button onClick={() => query.refetch()}>Try again</button></div>;
  const data = query.data!;
  if (!data.onboardingComplete) return <section className="empty-onboarding"><span className="brand-mark">u</span><h1>Build your first Unhookd plan</h1><p>Choose what pulls you in, when you want support, and what you would rather do.</p><Link className="primary-button" to="/onboarding">Begin onboarding <ArrowRight size={18} /></Link></section>;

  const nextWindow = data.windows[0];
  const completed = data.sessions.filter((session) => session.status === "confirmed").length;
  const helpful = data.sessions.filter((session) => session.helpfulness === "yes").length;
  return (
    <div className="page today-page">
      <header className="page-header"><div><span className="eyebrow">Today</span><h1>Come back to what matters.</h1></div><button className="secondary-button notification-button" onClick={() => enablePush.mutate()} disabled={enablePush.isPending}>{enablePush.isSuccess ? <BellRing size={18} /> : <Bell size={18} />}{enablePush.isSuccess ? "Nudges on" : "Enable nudges"}</button></header>
      {enablePush.error && <p className="error-banner">{enablePush.error.message}</p>}
      <section className="unhook-hero">
        <div><span className="status-line"><span />Your next window</span><h2>{nextWindow ? `${nextWindow.startTime}–${nextWindow.endTime}` : "Whenever you need it"}</h2><p>{nextWindow ? nextWindow.days.map((day) => dayNames[day]).join(" · ") : "Start a short real-world activity at any time."}</p></div>
        <Link className="primary-button large" to={`/live${nextWindow ? `?windowId=${nextWindow.id}` : ""}`}><Zap size={19} />Get unhookd now</Link>
      </section>
      <section className="metric-band" aria-label="This week's activity">
        <div><span>Completed</span><strong>{completed}</strong><small>Unhook activities</small></div>
        <div><span>Protected</span><strong>{data.protectedCount}</strong><small>Windows without a pull</small></div>
        <div><span>Helpful</span><strong>{helpful}</strong><small>Self-reported outcomes</small></div>
      </section>
      <div className="today-grid">
        <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Recent</span><h2>Your activity</h2></div><Link to="/progress">See progress <ArrowRight size={15} /></Link></div>
          {data.sessions.length ? <div className="session-list">{data.sessions.slice(0, 4).map((session) => <div className="session-row" key={session.id}><span className={`session-icon ${session.status}`}><CheckCircle2 size={18} /></span><span><strong>{session.activity.title}</strong><small>{new Date(session.startedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</small></span><span className="session-result">{session.helpfulness === "yes" ? "Helped" : session.status === "confirmed" ? "Completed" : "In progress"}</span></div>)}</div> : <div className="empty-inline"><Sparkles size={20} /><p>Your completed activities will appear here.</p></div>}
        </section>
        <aside className="privacy-panel"><ShieldCheck size={22} /><h2>Your camera stays live, not stored.</h2><p>Gemini observes the active session. Unhookd saves only progress and the outcome you confirm.</p><Link to="/settings">Review privacy</Link></aside>
      </div>
    </div>
  );
}
