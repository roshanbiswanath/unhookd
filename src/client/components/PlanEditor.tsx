import { Camera, Clock3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { OnboardingDraft, UsageCandidate } from "../../shared/contracts";

const activityOptions = ["Push-ups", "Wall push-ups", "Squats", "Stretching", "Take a short walk", "Drink water", "Read two pages"];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
  candidates?: UsageCandidate[];
};

export function PlanEditor({ draft, onChange, candidates = [] }: Props) {
  const [manualHook, setManualHook] = useState("");
  const addHook = (name: string, source: "manual" | "screenshot" = "manual", durationMinutes: number | null = null) => {
    if (!name.trim() || draft.hooks.length >= 3 || draft.hooks.some((hook) => hook.name.toLowerCase() === name.toLowerCase())) return;
    onChange({ ...draft, hooks: [...draft.hooks, { id: crypto.randomUUID(), name: name.trim(), source, durationMinutes }] });
    setManualHook("");
  };
  const removeHook = (id: string) => onChange({ ...draft, hooks: draft.hooks.filter((hook) => hook.id !== id), windows: draft.windows.filter((window) => window.hookId !== id) });
  const addWindow = (hookId: string) => onChange({ ...draft, windows: [...draft.windows, { id: crypto.randomUUID(), hookId, days: [1, 2, 3, 4, 5], startTime: "21:30", endTime: "23:00" }] });

  return (
    <div className="plan-editor">
      {candidates.length > 0 && (
        <section className="editor-section">
          <div className="section-heading"><div><span className="eyebrow">From your snapshot</span><h2>Potential hooks</h2></div><span className="limit">Choose up to 3</span></div>
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const selected = draft.hooks.some((hook) => hook.name === candidate.name);
              return <button type="button" key={candidate.id} className={`candidate-row ${selected ? "selected" : ""}`} onClick={() => selected ? removeHook(draft.hooks.find((hook) => hook.name === candidate.name)!.id) : addHook(candidate.name, "screenshot", candidate.durationMinutes)}>
                <span><strong>{candidate.name}</strong><small>{candidate.durationMinutes === null ? "Usage visible" : `${candidate.durationMinutes} min visible`} · {Math.round(candidate.confidence * 100)}% confidence</small></span>
                <span>{selected ? "Selected" : "Add"}</span>
              </button>;
            })}
          </div>
        </section>
      )}

      <section className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">01 · Hooks</span><h2>What pulls you in?</h2></div><span className="limit">{draft.hooks.length}/3</span></div>
        <div className="inline-input">
          <input value={manualHook} onChange={(event) => setManualHook(event.target.value)} placeholder="App or website" aria-label="App or website" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addHook(manualHook); } }} />
          <button type="button" className="icon-button" onClick={() => addHook(manualHook)} aria-label="Add hook"><Plus size={18} /></button>
        </div>
        <div className="hook-list">
          {draft.hooks.map((hook) => <div className="hook-row" key={hook.id}><span className="app-initial">{hook.name.slice(0, 1).toUpperCase()}</span><span><strong>{hook.name}</strong><small>{hook.durationMinutes ? `${hook.durationMinutes} minutes visible` : "Added manually"}</small></span><button type="button" className="icon-button quiet" onClick={() => removeHook(hook.id)} aria-label={`Remove ${hook.name}`}><Trash2 size={17} /></button></div>)}
          {!draft.hooks.length && <p className="empty-copy">Add the apps or sites you open more than you intend.</p>}
        </div>
      </section>

      <section className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">02 · Timing</span><h2>Your Unhook windows</h2></div><Clock3 size={20} /></div>
        {draft.hooks.map((hook) => {
          const window = draft.windows.find((item) => item.hookId === hook.id);
          if (!window) return <button key={hook.id} type="button" className="add-window" onClick={() => addWindow(hook.id)}><Plus size={17} /> Add a window for {hook.name}</button>;
          return <div className="window-editor" key={window.id}>
            <strong>{hook.name}</strong>
            <div className="time-row"><label>From<input type="time" value={window.startTime} onChange={(event) => onChange({ ...draft, windows: draft.windows.map((item) => item.id === window.id ? { ...item, startTime: event.target.value } : item) })} /></label><label>Until<input type="time" value={window.endTime} onChange={(event) => onChange({ ...draft, windows: draft.windows.map((item) => item.id === window.id ? { ...item, endTime: event.target.value } : item) })} /></label></div>
            <div className="day-picker" aria-label="Active days">{dayLabels.map((label, day) => <button type="button" key={label} className={window.days.includes(day) ? "active" : ""} onClick={() => onChange({ ...draft, windows: draft.windows.map((item) => item.id === window.id ? { ...item, days: item.days.includes(day) ? item.days.filter((value) => value !== day) : [...item.days, day].sort() } : item) })}>{label}</button>)}</div>
          </div>;
        })}
      </section>

      <section className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">03 · Alternatives</span><h2>What can replace the pull?</h2></div></div>
        <div className="choice-grid">{activityOptions.map((activity) => <label key={activity} className={draft.approvedActivities.includes(activity) ? "checked" : ""}><input type="checkbox" checked={draft.approvedActivities.includes(activity)} onChange={() => onChange({ ...draft, approvedActivities: draft.approvedActivities.includes(activity) ? draft.approvedActivities.filter((item) => item !== activity) : [...draft.approvedActivities, activity] })} /><span>{activity}</span></label>)}</div>
        <label className="field">Physical limitations or preferences<textarea value={draft.limitations} onChange={(event) => onChange({ ...draft, limitations: event.target.value })} placeholder="Optional" /></label>
      </section>

      <section className="editor-section preferences">
        <div><Camera size={20} /><span><strong>Camera-guided activities</strong><small>Live video is processed for the session and is not stored.</small></span><input type="checkbox" role="switch" checked={draft.cameraEnabled} onChange={(event) => onChange({ ...draft, cameraEnabled: event.target.checked })} /></div>
        <div><Clock3 size={20} /><span><strong>Scheduled nudges</strong><small>Notifications never name the app or urge.</small></span><input type="checkbox" role="switch" checked={draft.notificationsEnabled} onChange={(event) => onChange({ ...draft, notificationsEnabled: event.target.checked })} /></div>
      </section>
    </div>
  );
}
