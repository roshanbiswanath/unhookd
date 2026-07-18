import { useAuth } from "@clerk/clerk-react";
import { GoogleGenAI, Modality } from "@google/genai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ChevronRight, CircleStop, LoaderCircle, MicOff, RefreshCw, ShieldCheck, SkipForward, Video, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ActivityContract } from "../../shared/contracts";
import { apiFetch } from "../api";
import type { SessionRecord } from "../types";

type SessionResponse = { session: SessionRecord; ephemeralToken: string | null; liveModel: string | null };

function ratingLabel(value: number) {
  return ["No pull", "Light", "Present", "Strong", "Very strong", "Overwhelming"][value];
}

function base64FromCanvas(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.68).split(",")[1];
}

export function LivePage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [pullBefore, setPullBefore] = useState(3);
  const [pullAfter, setPullAfter] = useState(3);
  const [helpfulness, setHelpfulness] = useState<"yes" | "somewhat" | "no" | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "live" | "manual" | "error">("idle");
  const [caption, setCaption] = useState("Your activity will be guided here.");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameTimer = useRef<number | null>(null);
  const liveRef = useRef<any>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const nextAudioTime = useRef(0);

  const create = useMutation({
    mutationFn: () => apiFetch<SessionResponse>(getToken, "/api/live-sessions", { method: "POST", body: JSON.stringify({ windowId: params.get("windowId") || undefined, pullBefore }) }),
    onSuccess: async (data) => {
      setSession(data.session);
      await startCameraAndLive(data);
    },
  });

  const persistProgress = async (sessionId: string, observed: number, target: number, confidence: number, note: string) => {
    const result = await apiFetch<{ observed: number; complete: boolean }>(getToken, `/api/live-sessions/${sessionId}/progress`, {
      method: "POST",
      body: JSON.stringify({ eventId: crypto.randomUUID(), metric: session?.activity.metric ?? "count", observed, target, confidence, note }),
    });
    setSession((current) => current ? { ...current, observed: result.observed, status: result.complete ? "observed_complete" : current.status } : current);
    return result;
  };

  const enableAudio = () => {
    const context = audioRef.current ?? new AudioContext({ sampleRate: 24000 });
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
  };

  const playAudio = (base64: string) => {
    try {
      const bytes = Uint8Array.from(atob(base64), (item) => item.charCodeAt(0));
      const samples = new Int16Array(bytes.buffer);
      enableAudio();
      const context = audioRef.current!;
      const buffer = context.createBuffer(1, samples.length, 24000);
      const channel = buffer.getChannelData(0);
      samples.forEach((sample, index) => { channel[index] = sample / 32768; });
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const at = Math.max(context.currentTime, nextAudioTime.current);
      source.start(at);
      nextAudioTime.current = at + buffer.duration;
    } catch {
      // Captions remain available if a browser blocks audio playback.
    }
  };

  const startCameraAndLive = async (created: SessionResponse) => {
    const activity = created.session.activity;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch {
      setCameraError("Camera access was not available. You can still complete this activity manually.");
      setLiveStatus("manual");
      return;
    }
    if (!created.ephemeralToken || !created.liveModel) {
      setLiveStatus("manual");
      setCameraError("Live Coach is not configured. Your camera stays local and manual completion is available.");
      return;
    }
    setLiveStatus("connecting");
    try {
      const ai = new GoogleGenAI({ apiKey: created.ephemeralToken, apiVersion: "v1alpha" });
      const live = await ai.live.connect({
        model: created.liveModel,
        config: { responseModalities: [Modality.AUDIO], outputAudioTranscription: {} },
        callbacks: {
          onopen: () => {
            setLiveStatus("live");
            setCaption(`I’m here. Start ${activity.title.toLowerCase()} when you’re ready.`);
          },
          onmessage: async (message) => {
            const text = message.serverContent?.outputTranscription?.text
              || message.serverContent?.modelTurn?.parts?.map((part) => part.text).find(Boolean)
              || message.text;
            if (text) setCaption(text);
            const audio = message.serverContent?.modelTurn?.parts?.find((part) => part.inlineData?.mimeType?.startsWith("audio/pcm"))?.inlineData?.data;
            if (audio) playAudio(audio);
            const calls = message.toolCall?.functionCalls ?? [];
            for (const call of calls) {
              if (call.name !== "report_activity_progress") continue;
              const args = call.args ?? {};
              const observed = Number(args.observed ?? 0);
              const target = Number(args.target ?? activity.target);
              const confidence = Number(args.confidence ?? 0);
              const note = String(args.note ?? "Live observation");
              const result = await persistProgress(created.session.id, observed, target, confidence, note);
              live.sendToolResponse({ functionResponses: { id: call.id, name: call.name, response: { output: { observed: result.observed, complete: result.complete } } } });
            }
          },
          onerror: () => { setLiveStatus("manual"); setCameraError("Live Coach disconnected. Manual completion is still available."); },
          onclose: () => { if (liveStatus === "live") setLiveStatus("manual"); },
        },
      });
      liveRef.current = live;
      live.sendClientContent({ turns: [{ role: "user", parts: [{ text: `Start coaching the user through ${activity.title}. Give one brief spoken and transcribed start cue, then observe only what the camera can show.` }] }], turnComplete: true });
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      frameTimer.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        live.sendRealtimeInput({ video: { data: base64FromCanvas(canvas), mimeType: "image/jpeg" } });
      }, 950);
    } catch {
      setLiveStatus("manual");
      setCameraError("Live Coach could not connect. You can complete this activity manually.");
    }
  };

  const complete = useMutation({
    mutationFn: () => apiFetch<{ session: SessionRecord }>(getToken, `/api/live-sessions/${session!.id}/complete`, { method: "POST", body: JSON.stringify({ confirmed: true, pullBefore, pullAfter, helpfulness }) }),
    onSuccess: () => { stopLive(); setFinished(true); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  const stopLive = () => {
    if (frameTimer.current) window.clearInterval(frameTimer.current);
    frameTimer.current = null;
    liveRef.current?.close?.();
    liveRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.close();
    audioRef.current = null;
  };
  useEffect(() => () => stopLive(), []);

  if (finished) return <div className="completion-page"><span className="completion-mark"><Check size={30} /></span><span className="eyebrow">Unhook complete</span><h1>You made a different choice.</h1><p>Your outcome is now part of what Unhookd learns from.</p><button className="primary-button" onClick={() => navigate("/progress")}>See progress <ChevronRight size={18} /></button></div>;
  if (!session) return <div className="live-setup"><button className="close-live" onClick={() => navigate("/today")} aria-label="Close"><X size={20} /></button><div className="live-setup-copy"><span className="eyebrow">Get unhookd</span><h1>Take one minute for something real.</h1><p>Rate the pull, then Unhookd will choose an activity from the alternatives you approved.</p><div className="rating-control"><div><strong>{pullBefore}</strong><span>{ratingLabel(pullBefore)}</span></div><input aria-label="Current pull" type="range" min="0" max="5" value={pullBefore} onChange={(event) => setPullBefore(Number(event.target.value))} /><div className="range-labels"><span>None</span><span>Strong</span></div></div><button className="primary-button large" disabled={create.isPending} onClick={() => { enableAudio(); create.mutate(); }}>{create.isPending ? <LoaderCircle className="spin" /> : <Video size={19} />}{create.isPending ? "Preparing..." : "Choose my activity"}</button>{create.error && <p className="error-banner">{create.error.message}</p>}</div><aside className="live-privacy"><ShieldCheck size={22} /><strong>Live is optional</strong><p>Camera frames are sent directly to Gemini for this session. Unhookd does not store video.</p></aside></div>;

  const activity: ActivityContract = session.activity;
  const manualAdvance = () => persistProgress(session.id, Math.min(activity.target, session.observed + 1), activity.target, 0, "Manual user entry");
  return <div className="live-page"><button className="close-live" onClick={() => { stopLive(); navigate("/today"); }} aria-label="End session"><X size={20} /></button><section className="camera-stage"><video ref={videoRef} muted playsInline className={liveStatus === "manual" ? "camera-muted" : ""} /><div className="camera-overlay"><span className={`live-indicator ${liveStatus}`}><span />{liveStatus === "live" ? "Live Coach" : liveStatus === "connecting" ? "Connecting" : "Manual mode"}</span><span className="observation-label">{liveStatus === "live" ? "AI observed" : "User reported"}</span></div>{liveStatus === "manual" && <div className="manual-camera"><Camera size={28} /><span>Camera guidance is optional</span></div>}</section><section className="live-controls"><span className="eyebrow">Your activity</span><h1>{activity.title}</h1><p className="live-caption"><Volume2 size={17} />{caption}</p><ol className="activity-steps">{activity.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol><div className="progress-display"><span>{session.observed}</span><i /> <strong>{activity.target}</strong><small>{activity.unit}</small></div><div className="live-actions"><button className="secondary-button" onClick={manualAdvance} disabled={session.observed >= activity.target}><RefreshCw size={17} />Mark one {activity.unit.replace(/s$/, "")}</button><button className="secondary-button" onClick={() => { stopLive(); setLiveStatus("manual"); }}><MicOff size={17} />Manual mode</button></div>{cameraError && <p className="live-warning">{cameraError}</p>}<div className="complete-panel"><span>When you’re ready</span><button className="primary-button" onClick={() => complete.mutate()} disabled={complete.isPending}>{complete.isPending ? "Saving..." : <><CircleStop size={18} />Finish activity</>}</button></div><div className="outcome-control"><span>How did it help?</span><div>{(["yes", "somewhat", "no"] as const).map((value) => <button key={value} className={helpfulness === value ? "selected" : ""} onClick={() => setHelpfulness(value)}>{value === "yes" ? "Helped" : value === "somewhat" ? "Somewhat" : "Not really"}</button>)}</div><label>Pull now <input type="range" min="0" max="5" value={pullAfter} onChange={(event) => setPullAfter(Number(event.target.value))} /></label></div></section></div>;
}
