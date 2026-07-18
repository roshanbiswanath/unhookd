import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Database, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { apiFetch } from "../api";

export function SettingsPage() {
  const { getToken, signOut } = useAuth();
  const remove = useMutation({ mutationFn: () => apiFetch<{ deleted: boolean }>(getToken, "/api/account", { method: "DELETE" }), onSuccess: () => signOut() });
  return <div className="page settings-page"><header className="page-header"><div><span className="eyebrow">Settings</span><h1>Privacy is part of the product.</h1><p>Unhookd keeps only the information required to personalize your plan.</p></div></header><section className="settings-list"><article><ShieldCheck /><span><strong>Authentication</strong><small>Clerk manages passwords and sessions. Unhookd never stores your password.</small></span></article><article><Camera /><span><strong>Live media</strong><small>Camera and audio go directly to Gemini for the active session and are not stored by Unhookd.</small></span></article><article><Database /><span><strong>Usage snapshots</strong><small>Screenshots are normalized in memory and discarded immediately after extraction.</small></span></article><article><KeyRound /><span><strong>AI credentials</strong><small>OpenAI and Gemini credentials remain on the server. The browser receives only a restricted Live token.</small></span></article></section><section className="danger-zone"><div><h2>Delete account data</h2><p>Remove your plan, messages, sessions, outcomes, and push subscriptions.</p></div><button className="danger-button" onClick={() => window.confirm("Permanently delete all Unhookd data?") && remove.mutate()} disabled={remove.isPending}><Trash2 size={17} />{remove.isPending ? "Deleting..." : "Delete my data"}</button>{remove.error && <p className="field-error">{remove.error.message}</p>}</section></div>;
}
