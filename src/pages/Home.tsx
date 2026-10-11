import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Mic,
  Utensils,
  MapPin,
  Soup,
  HeartPulse,
  Mountain,
  CalendarDays,
  Droplets,
  Footprints,
  Compass,
  Bot,
  Sparkles,
  ShieldCheck,
  Search as SearchIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useLinc } from "../state";
import {
  dishes,
  mealSuggestions,
  mealPeriodForHour,
} from "../../shared/cuisine";
import { eventDraft } from "../../shared/contracts";
import { Button, ErrorBox } from "../components/ui";
import { isHealthText, screenSafety } from "../../shared/safety";
import { DestinationBackdrop } from "../components/DestinationBackdrop";
export function Home({
  onNew,
  onVoice,
  onVoiceMeal,
  onMeal,
  onFood,
}: {
  onNew: () => void;
  onVoice: () => void;
  onVoiceMeal: () => void;
  onMeal: () => void;
  onFood: () => void;
}) {
  const {
    activeJourney,
    events,
    profile,
    signedIn,
    setAuthOpen,
    busy,
    dataError,
    refresh,
    call,
    notify,
  } = useLinc();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [recLogging, setRecLogging] = useState<string | null>(null);
  const name = profile.display_name?.split(" ")[0] || "traveler";
  const diet = profile.signup?.dietary_preference;
  const vegOnly = diet === "vegetarian" || diet === "vegan";
  const period = mealPeriodForHour(new Date().getHours());
  const mealRecs = mealSuggestions
    .filter((s) => s.period === period)
    .filter((s) => !vegOnly || s.diet === "vegetarian")
    .slice(0, 3);
  async function logRecommendation(label: string) {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    if (!activeJourney) {
      onNew();
      return;
    }
    if (!profile.consents.sensitive_storage) {
      notify("Enable private storage in Profile before saving entries.");
      return;
    }
    setRecLogging(label);
    try {
      const draft = eventDraft.parse({
        event_type: "meal",
        title: label,
        occurred_at: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await call("events", "POST", {
        request_id: crypto.randomUUID(),
        journey_id: activeJourney.id,
        event: draft,
      });
      await refresh();
      notify(`${label} added to your journey.`);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setRecLogging(null);
    }
  }
  const today = events.filter(
    (e) =>
      new Date(e.occurred_at || e.created_at).toDateString() ===
      new Date().toDateString(),
  );
  const meals = today.filter((e) => e.event_type === "meal").length;
  const water = today
    .filter((e) => e.event_type === "hydration")
    .reduce((sum, e) => sum + (e.metadata_json.amount_ml || 0), 0);
  const recent = [...events]
    .sort(
      (a, b) =>
        new Date(b.occurred_at || b.created_at).getTime() -
        new Date(a.occurred_at || a.created_at).getTime(),
    )
    .slice(0, 3);
  const goChat = (value: string) => {
    if (
      !signedIn &&
      !isHealthText(value) &&
      screenSafety(value).urgency === "none"
    ) {
      setAuthOpen(true);
      return;
    }
    navigate("/chat", { state: { send: value } });
  };
  return (
    <div className="page home-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            YOUR COMPANION, ALONG THE WAY
          </div>
          <h1>
            Good to see you, {name}
            <span className="greeting-dot">.</span>
          </h1>
          <p>More exploring. Less worrying. A little company along the way.</p>
        </div>
        <Button
          variant="secondary"
          className="new-journey-button"
          onClick={onNew}
        >
          <Compass size={17} />
          New journey
        </Button>
      </div>
      {dataError && (
        <ErrorBox message={dataError.message} retry={() => void refresh()} />
      )}
      <section className="mobile-welcome-hero" aria-label="Welcome to LINC-33">
        <img
          src="/images/kerala-backwaters.webp"
          alt="Traditional Kerala houseboat crossing calm tropical backwaters"
          fetchPriority="high"
        />
        <div className="mobile-hero-overlay" />
        <div className="mobile-welcome-copy">
          <span>TRAVEL WELL, FEEL AT HOME</span>
          <h1>Good to see you, {name}.</h1>
          <p>More exploring. Less worrying. I’m here when you need me.</p>
        </div>
        <form
          className="mobile-hero-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) goChat(text);
          }}
        >
          <SearchIcon size={18} />
          <input
            aria-label="Ask LINC-33 from home"
            placeholder="Ask me anything…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
          />
          <button type="button" onClick={onVoice} aria-label="Speak to LINC-33">
            <Mic size={18} />
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
          >
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
      <section
        className="panel recommend-panel"
        aria-label="Recommended for you"
      >
        <div className="card-title">
          <div>
            <Sparkles size={19} />
            <h3>Recommended for you</h3>
          </div>
          <span className="muted small recommend-period">{period}</span>
        </div>
        <div className="recommend-row">
          {mealRecs.map((s) => (
            <button
              type="button"
              className="chip"
              key={s.id}
              disabled={recLogging === s.label}
              onClick={() => void logRecommendation(s.label)}
            >
              {recLogging === s.label ? "Saving…" : s.label}
            </button>
          ))}
        </div>
        {activeJourney ? (
          <button className="nearby-choice" onClick={() => navigate("/nearby")}>
            <span className="mini-icon rose">
              <MapPin size={18} />
            </span>
            <span>
              <strong>Not sure what’s around?</strong>
              <small>Check hospitals, pharmacies & petrol nearby</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ) : (
          <button className="nearby-choice" onClick={onNew}>
            <span className="mini-icon green">
              <Compass size={18} />
            </span>
            <span>
              <strong>Start your journey</strong>
              <small>Save meals and moments as you go</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        )}
      </section>
      <div className="hero-grid">
        <section className="journey-hero" aria-label="Your journey">
          <DestinationBackdrop destination={activeJourney?.destination_name} />
          <div className="journey-shade" />
          <div className="journey-hero-top">
            <span className="photo-pill">
              <MapPin size={13} />
              {activeJourney ? "YOUR ACTIVE JOURNEY" : "A LITTLE INSPIRATION"}
            </span>
            <Mountain size={24} />
          </div>
          <div className="journey-hero-bottom">
            <div className="eyebrow photo-eyebrow">
              {activeJourney?.title || "THE MOUNTAINS ARE CALLING"}
            </div>
            <h2>{activeJourney?.destination_name || "Munnar, Kerala"}</h2>
            <p>
              {activeJourney
                ? `${format(new Date(activeJourney.started_at), "MMM d")}${activeJourney.ended_at ? ` — ${format(new Date(activeJourney.ended_at), "MMM d, yyyy")}` : ""}`
                : "Tea gardens. Quiet mornings. Room to breathe."}
            </p>
            <div className="journey-photo-footer">
              <span>
                <Compass size={16} />
                {activeJourney
                  ? "Make this journey yours"
                  : "Your next chapter starts here"}
              </span>
              <button
                className="photo-button"
                onClick={activeJourney ? () => navigate("/journey") : onNew}
              >
                {activeJourney ? "View journey" : "Start a journey"}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>
        <section className="companion-panel panel">
          <div className="companion-intro">
            <div>
              <div className="eyebrow">MEET YOUR TRAVEL COMPANION</div>
              <h2>A little help. A lot of possibility.</h2>
              <p>
                Tell me what you ate, how you feel,
                <br className="desktop-break" />
                or where you’d like to go next.
              </p>
            </div>
            <div className="companion-avatar" aria-hidden="true">
              <Bot size={38} />
              <span className="avatar-spark">
                <Sparkles size={12} />
              </span>
            </div>
          </div>
          <form
            className="home-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) goChat(text);
            }}
          >
            <input
              aria-label="Ask LINC-33"
              placeholder="What’s on your mind?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
            />
            <button
              type="button"
              className="composer-mic"
              onClick={onVoice}
              aria-label="Record a voice message"
            >
              <Mic size={19} />
            </button>
            <button
              className="send-button"
              aria-label="Send message"
              disabled={!text.trim()}
            >
              <ArrowRight size={20} />
            </button>
          </form>
          <div className="quick-actions">
            <button onClick={onMeal}>
              <span className="action-icon green">
                <Utensils size={21} />
              </span>
              <span>Log a meal</span>
            </button>
            <button onClick={onVoice}>
              <span className="action-icon purple">
                <Mic size={21} />
              </span>
              <span>Speak</span>
            </button>
            <button onClick={() => navigate("/nearby")}>
              <span className="action-icon rose">
                <MapPin size={21} />
              </span>
              <span>Nearby help</span>
            </button>
            <button onClick={onFood}>
              <span className="action-icon amber">
                <Soup size={21} />
              </span>
              <span>Local food</span>
            </button>
          </div>
          <button className="symptom-link" onClick={onVoiceMeal}>
            <Mic size={15} />
            Food diary by voice
            <ArrowRight size={14} />
          </button>
          <button
            className="symptom-link"
            onClick={() => goChat("I’m not feeling well.")}
          >
            <HeartPulse size={15} />
            Not feeling your best? Let’s take a look.
            <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <section className="mobile-continue" aria-label="Continue your journey">
        <div className="mobile-section-title">
          <h2>Continue your journey</h2>
          <button onClick={activeJourney ? () => navigate("/journey") : onNew}>
            See all <ArrowUpRight size={14} />
          </button>
        </div>
        <button
          className="continue-card"
          onClick={activeJourney ? () => navigate("/journey") : onNew}
        >
          <DestinationBackdrop destination={activeJourney?.destination_name} />
          <span>
            <strong>
              {activeJourney?.destination_name || "Munnar, Kerala"}
            </strong>
            <small>
              {activeJourney?.title || "Tea gardens, cool air, happy you."}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      </section>
      <div className="home-cards">
        <section className="panel summary-panel">
          <div className="card-title">
            <div>
              <CalendarDays size={19} />
              <h3>Your day, so far</h3>
            </div>
            <button className="text-link" onClick={() => navigate("/journey")}>
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="card-date">{format(new Date(), "EEEE, MMMM d")}</p>
          <div className="summary-grid">
            <div>
              <span className="mini-icon green">
                <Utensils size={18} />
              </span>
              <span>
                <strong>
                  {meals
                    ? `${meals} meal${meals > 1 ? "s" : ""} logged`
                    : "A fresh start"}
                </strong>
                <small>
                  {meals
                    ? "Little moments, remembered"
                    : "Your first meal awaits"}
                </small>
              </span>
            </div>
            <div>
              <span className="mini-icon blue">
                <Droplets size={18} />
              </span>
              <span>
                <strong>
                  {water
                    ? `${(water / 1000).toFixed(1)} L logged`
                    : "Water check-in"}
                </strong>
                <small>
                  {water
                    ? "Your reported hydration"
                    : "Log a drink along the way"}
                </small>
              </span>
            </div>
            <div>
              <span className="mini-icon purple">
                <Footprints size={18} />
              </span>
              <span>
                <strong>
                  {today.filter((e) => e.event_type === "activity").length ||
                    "No"}{" "}
                  activities
                </strong>
                <small>From your own entries</small>
              </span>
            </div>
            <div>
              <span className="mini-icon rose">
                <HeartPulse size={18} />
              </span>
              <span>
                <strong>
                  {today.some((e) => e.event_type === "symptom")
                    ? "Check your records"
                    : "How are you feeling?"}
                </strong>
                <small>
                  {today.some((e) => e.event_type === "symptom")
                    ? "Symptoms reported today"
                    : "A moment to check in"}
                </small>
              </span>
            </div>
          </div>
        </section>
        <section className="panel nearby-teaser">
          <div className="card-title">
            <div>
              <MapPin size={19} />
              <h3>A little help, nearby</h3>
            </div>
            <button className="text-link" onClick={() => navigate("/nearby")}>
              Explore
              <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="card-date">When you need it, we’ll help you find it.</p>
          <button
            className="nearby-choice"
            onClick={() =>
              navigate("/nearby", { state: { category: "hospitals" } })
            }
          >
            <span className="mini-icon rose">
              <HeartPulse size={20} />
            </span>
            <span>
              <strong>Hospitals & clinics</strong>
              <small>Find real care around you</small>
            </span>
            <ArrowUpRight size={18} />
          </button>
          <button
            className="nearby-choice"
            onClick={() =>
              navigate("/nearby", { state: { category: "pharmacies" } })
            }
          >
            <span className="mini-icon green">
              <ShieldCheck size={20} />
            </span>
            <span>
              <strong>Pharmacies</strong>
              <small>Search your current location</small>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </section>
        <section className="panel food-teaser">
          <div className="card-title">
            <div>
              <Utensils size={19} />
              <h3>A taste of Kerala</h3>
            </div>
            <button className="text-link" onClick={onFood}>
              Explore
              <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="card-date">Meet the flavors of your destination.</p>
          <div className="food-mini-grid">
            {dishes.slice(0, 6).map((d) => (
              <button key={d.id} onClick={onFood}>
                {d.image ? (
                  <img src={d.image} alt={d.name} loading="lazy" />
                ) : (
                  <span className="food-mini-placeholder" aria-hidden="true">
                    <Soup size={20} />
                  </span>
                )}
                <strong>{d.name}</strong>
                <small>
                  {d.diet === "vegetarian" ? "Vegetarian" : "Non-vegetarian"}
                </small>
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="recent-section">
        <div className="section-heading">
          <h3>Little moments, remembered</h3>
          <span className="muted small">
            {activeJourney?.title || "Your journey story"}
          </span>
        </div>
        {busy ? (
          <p className="muted">Gathering your journey…</p>
        ) : recent.length ? (
          <div className="recent-list">
            {recent.map((e) => (
              <button key={e.id} onClick={() => navigate("/journey")}>
                <span
                  className={`mini-icon ${e.event_type === "meal" ? "green" : e.event_type === "hydration" ? "blue" : "purple"}`}
                >
                  {e.event_type === "meal" ? (
                    <Utensils size={18} />
                  ) : e.event_type === "hydration" ? (
                    <Droplets size={18} />
                  ) : (
                    <Compass size={18} />
                  )}
                </span>
                <span>
                  <strong>{e.title}</strong>
                  <small>
                    {e.time_text ||
                      format(new Date(e.occurred_at || e.created_at), "h:mm a")}
                    {!e.occurred_at && !e.time_text ? " · logged time" : ""}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="recent-empty">
            <Compass size={21} />
            <p>
              Your story starts with a journey. We’ll remember the moments you
              choose to save.
            </p>
            <button className="text-link" onClick={onNew}>
              Start yours
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <div className="public-policy-links">
        <Link to="/privacy">Privacy notice</Link>
        <Link to="/terms">Terms of use</Link>
      </div>
      <div className="home-footnote">
        <Mountain size={15} />
        <span>Go a little further. Feel a little more at home.</span>
      </div>
    </div>
  );
}
