import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowDown, CheckCircle2, LoaderCircle } from "lucide-react";
import { apiFetch } from "../api";
import type { DashboardResponse } from "../types";

export function ProgressPage() {
  const { getToken } = useAuth();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardResponse>(getToken, "/api/dashboard") });
  if (query.isLoading) return <div className="page-loader"><LoaderCircle className="spin" /></div>;
  if (query.error) return <div className="error-state"><h1>Progress is unavailable</h1><p>{query.error.message}</p></div>;
  const sessions = query.data!.sessions.filter((session) => session.status === "confirmed");
  const rated = sessions.filter((session) => session.pullBefore !== null && session.pullAfter !== null);
  const averageDrop = rated.length ? rated.reduce((sum, session) => sum + Math.max(0, session.pullBefore! - session.pullAfter!), 0) / rated.length : null;
  return <div className="page progress-page">
    <header className="page-header"><div><span className="eyebrow">Progress</span><h1>Evidence, not pressure.</h1><p>Only outcomes you have actually recorded appear here.</p></div></header>
    <section className="metric-band progress-metrics"><div><span>Confirmed activities</span><strong>{sessions.length}</strong><small>All time</small></div><div><span>Protected windows</span><strong>{query.data!.protectedCount}</strong><small>“I’m good” responses</small></div><div><span>Average pull change</span><strong>{averageDrop === null ? "—" : `-${averageDrop.toFixed(1)}`}</strong><small>{rated.length < 3 ? "More ratings needed" : "On a five-point scale"}</small></div></section>
    <section className="content-section progress-history"><div className="section-heading"><div><span className="eyebrow">History</span><h2>Every Unhook</h2></div></div>
      {sessions.length ? <div className="history-list">{sessions.map((session) => <article key={session.id}><div className="history-date"><span>{new Date(session.startedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span><small>{new Date(session.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div><div className="history-activity"><span className="session-icon confirmed"><Activity size={18} /></span><span><strong>{session.activity.title}</strong><small>{session.observed} of {session.activity.target} {session.activity.unit} observed</small></span></div><div className="pull-change">{session.pullBefore !== null && session.pullAfter !== null ? <><span>{session.pullBefore}</span><ArrowDown size={16} /><span>{session.pullAfter}</span></> : <span>Not rated</span>}</div><span className={`outcome ${session.helpfulness ?? "none"}`}><CheckCircle2 size={15} />{session.helpfulness === "yes" ? "Helpful" : session.helpfulness === "somewhat" ? "Somewhat" : session.helpfulness === "no" ? "Not helpful" : "Completed"}</span></article>)}</div> : <div className="empty-large"><Activity size={24} /><h3>No completed activities yet</h3><p>Your first confirmed Unhook will create this history.</p></div>}
    </section>
  </div>;
}
