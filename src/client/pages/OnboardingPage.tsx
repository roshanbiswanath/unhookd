import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageUp, LoaderCircle, MessageCircle, PanelRight, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OnboardingDraft, UsageCandidate } from "../../shared/contracts";
import { apiFetch } from "../api";
import { PlanEditor } from "../components/PlanEditor";

type OnboardingResponse = { draft: OnboardingDraft; version: number; messages: Array<{ id: string; role: string; content: string }> };

export function OnboardingPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"conversation" | "plan">("conversation");
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<UsageCandidate[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const query = useQuery({ queryKey: ["onboarding"], queryFn: () => apiFetch<OnboardingResponse>(getToken, "/api/onboarding") });
  useEffect(() => {
    if (!query.data) return;
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const isNewPlan = !query.data.draft.completed && !query.data.draft.hooks.length;
    setDraft({ ...query.data.draft, timezone: isNewPlan ? browserTimezone : query.data.draft.timezone });
    setVersion(query.data.version);
  }, [query.data]);

  const chat = useMutation({
    mutationFn: (text: string) => apiFetch<{ assistantMessage: string; draft: OnboardingDraft; version: number }>(getToken, "/api/onboarding/message", { method: "POST", body: JSON.stringify({ message: text, version }) }),
    onSuccess: (data) => { setDraft(data.draft); setVersion(data.version); setMessage(""); void queryClient.invalidateQueries({ queryKey: ["onboarding"] }); },
  });
  const upload = useMutation({
    mutationFn: (files: FileList) => { const form = new FormData(); Array.from(files).slice(0, 6).forEach((file) => form.append("screenshots", file)); return apiFetch<{ candidates: UsageCandidate[] }>(getToken, "/api/usage-import", { method: "POST", body: form }); },
    onSuccess: (data) => { setCandidates(data.candidates); setView("plan"); },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Plan is not ready");
      const updated = await apiFetch<{ draft: OnboardingDraft; version: number }>(getToken, "/api/onboarding", { method: "PATCH", body: JSON.stringify({ patch: draft, version }) });
      setVersion(updated.version);
      return apiFetch<{ activated: boolean }>(getToken, "/api/onboarding/activate", { method: "POST" });
    },
    onSuccess: () => navigate("/today"),
  });

  if (query.isLoading) return <div className="page-loader"><LoaderCircle className="spin" /><span>Preparing your plan</span></div>;
  if (query.error || !draft) return <main className="error-state"><span className="brand-mark">u</span><h1>Your plan could not load</h1><p>{query.error?.message ?? "Unhookd could not create your onboarding plan."}</p><button className="primary-button" onClick={() => query.refetch()}>Try again</button><p className="recovery-note">If this persists, confirm that the API server is running and its database migration has been applied.</p></main>;
  const messages = query.data?.messages ?? [];

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <div className="brand"><span className="brand-mark">u</span><span>Unhookd</span></div>
        <div className="view-switch" role="tablist"><button className={view === "conversation" ? "active" : ""} onClick={() => setView("conversation")}><MessageCircle size={16} />Conversation</button><button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><PanelRight size={16} />My plan</button></div>
        <span className="privacy-note"><ShieldCheck size={16} />Private by design</span>
      </header>
      <div className="onboarding-body">
        {view === "conversation" ? <section className="conversation-panel">
          <div className="conversation-copy"><span className="eyebrow">Build your Unhookd plan</span><h1>What keeps pulling you back?</h1><p>Talk it through, or add a Digital Wellbeing snapshot. You approve everything before it becomes part of your plan.</p></div>
          <div className="messages" aria-live="polite">
            {!messages.length && <div className="message assistant">Start with the app or site you open more than you intend. When does it usually happen?</div>}
            {messages.map((item) => <div key={item.id} className={`message ${item.role}`}>{item.content}</div>)}
            {chat.isPending && <div className="message assistant typing"><span /><span /><span /></div>}
          </div>
          {(chat.error || upload.error) && <p className="error-banner">{(chat.error ?? upload.error)?.message}</p>}
          <div className="conversation-actions">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => event.target.files && upload.mutate(event.target.files)} />
            <button className="icon-button upload" onClick={() => fileRef.current?.click()} disabled={upload.isPending} aria-label="Upload Digital Wellbeing screenshots">{upload.isPending ? <LoaderCircle className="spin" size={19} /> : <ImageUp size={19} />}</button>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Unhookd what you notice..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (message.trim()) chat.mutate(message.trim()); } }} />
            <button className="icon-button send" disabled={!message.trim() || chat.isPending} onClick={() => chat.mutate(message.trim())} aria-label="Send message"><Send size={18} /></button>
          </div>
          <small className="upload-help">Up to six screenshots. Images are discarded after extraction.</small>
        </section> : <section className="plan-panel"><div className="plan-title"><span className="eyebrow">Review and activate</span><h1>Your plan, in your words.</h1><p>Correct anything the AI misunderstood. Nothing is final until you activate it.</p></div><PlanEditor draft={draft} onChange={setDraft} candidates={candidates} /></section>}
        <aside className="plan-summary">
          <span className="eyebrow">Plan status</span><h2>{draft.hooks.length ? `${draft.hooks.length} hook${draft.hooks.length > 1 ? "s" : ""} selected` : "Waiting for your first hook"}</h2>
          <div className="summary-list"><span><Check size={15} />{draft.windows.length} Unhook window{draft.windows.length === 1 ? "" : "s"}</span><span><Check size={15} />{draft.approvedActivities.length} approved activities</span><span><Check size={15} />{draft.cameraEnabled ? "Live Coach enabled" : "Manual mode"}</span></div>
          <button className="primary-button" disabled={save.isPending || !draft.hooks.length || !draft.windows.length} onClick={() => save.mutate()}>{save.isPending ? "Activating..." : "Activate my plan"}</button>
          {save.error && <p className="field-error">{save.error.message}</p>}
        </aside>
      </div>
    </main>
  );
}
