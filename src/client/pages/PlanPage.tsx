import { CalendarClock, MessageCircle, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

export function PlanPage() {
  return <div className="page"><header className="page-header"><div><span className="eyebrow">Plan</span><h1>Your support, on your terms.</h1><p>Return to the synchronized conversation and structural editor whenever your routine changes.</p></div></header><section className="plan-entry"><div><CalendarClock size={24} /><h2>Review your Unhookd plan</h2><p>Change hooks, windows, approved activities, limitations, and Live Coach preferences in one place.</p></div><div className="plan-entry-actions"><Link className="secondary-button" to="/onboarding"><MessageCircle size={17} />Conversation</Link><Link className="primary-button" to="/onboarding"><Pencil size={17} />Edit my plan</Link></div></section></div>;
}
