import {
  lazy,
  Suspense,
  Component,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  MountainSnow,
  House,
  Map,
  MapPin,
  UserRound,
  Search,
  ShieldAlert,
  ArrowUpRight,
  Phone,
  WifiOff,
  Heart,
  Compass,
  PanelLeftClose,
  Menu,
  X,
} from "lucide-react";
import type { JourneyEvent, EventType } from "../shared/contracts";
import { useLinc } from "./state";
import { Button, Modal } from "./components/ui";
import { Auth } from "./components/Auth";
import { Voice } from "./components/Voice";
import { JourneyForm, EventForm } from "./components/JourneyForms";
import { Home } from "./pages/Home";
import { Policies } from "./pages/Policies";
const Chat = lazy(() =>
  import("./pages/Chat").then((m) => ({ default: m.Chat })),
);
const JourneyPage = lazy(() =>
  import("./pages/Journey").then((m) => ({ default: m.JourneyPage })),
);
const Nearby = lazy(() =>
  import("./pages/Nearby").then((m) => ({ default: m.Nearby })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);
import { Food } from "./pages/Food";
const nav = [
  { to: "/", name: "Ask", icon: House },
  { to: "/journey", name: "Journey", icon: Map },
  { to: "/nearby", name: "Nearby", icon: MapPin },
  { to: "/profile", name: "Profile", icon: UserRound },
];
class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="page" role="alert">
        <h1>This page needs a fresh start.</h1>
        <p>
          Reconnect if you’re offline, then retry. Emergency access remains
          available above.
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const { preview, profile, signedIn, setAuthOpen, notice, activeJourney } =
    useLinc();
  const navigate = useNavigate();
  const route = useLocation();
  const [voice, setVoice] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"conversation" | "meal">(
    "conversation",
  );
  function openVoice(mode: "conversation" | "meal" = "conversation") {
    setVoiceMode(mode);
    setVoice(true);
  }
  const [newJourney, setNewJourney] = useState(false);
  const [food, setFood] = useState(false);
  const [sos, setSOS] = useState(false);
  const [region, setRegion] = useState("");
  const [eventOpen, setEventOpen] = useState(false);
  const [event, setEvent] = useState<JourneyEvent | null>(null);
  const [type, setType] = useState<EventType>("note");
  const [eventJourney, setEventJourney] = useState<string | undefined>();
  const [online, setOnline] = useState(navigator.onLine);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setMenu(false);
    if (route.pathname !== "/chat") window.scrollTo({ top: 0 });
  }, [route.pathname]);
  function addEvent(t: EventType, id?: string) {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    if (!activeJourney && !id) {
      setNewJourney(true);
      return;
    }
    setEvent(null);
    setType(t);
    setEventJourney(id);
    setEventOpen(true);
  }
  function startJourney() {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    setNewJourney(true);
  }
  const links = nav.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      aria-label={item.name}
      end={item.to === "/"}
      className={({ isActive }) =>
        `nav-link ${isActive || (item.to === "/" && route.pathname === "/chat") ? "active" : ""}`
      }
    >
      <item.icon size={21} />
      <span>{item.name}</span>
      <span className="nav-active-dot" />
    </NavLink>
  ));
  return (
    <>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
          <a
            className="brand"
            aria-label="LINC-33 home"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <MountainSnow size={34} strokeWidth={1.8} />
            <span>
              LINC<span className="brand-dash">—</span>33
            </span>
          </a>
          <span className="brand-caption">YOUR JOURNEY, CONNECTED.</span>
          <nav aria-label="Main navigation">{links}</nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <Compass size={22} />
              <p>
                A little further.
                <br />
                <strong>A little better.</strong>
              </p>
              <span>We’re along for the journey.</span>
            </div>
            <button
              className="sidebar-privacy"
              onClick={() => navigate("/profile")}
            >
              <ShieldAlert size={16} />
              Your privacy matters
              <ArrowUpRight size={13} />
            </button>
            <div className="public-policy-links">
              <NavLink to="/privacy">Privacy</NavLink>
              <NavLink to="/terms">Terms</NavLink>
            </div>
            <span className="sidebar-version">
              TRAVEL · REMEMBER · FEEL AT HOME
            </span>
          </div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) {
                  navigate("/chat", { state: { send: search } });
                  setSearch("");
                }
              }}
            >
              <Search size={18} />
              <input
                aria-label="Ask your companion"
                placeholder="Ask LINC-33 anything…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={4000}
              />
              <span className="search-hint">A LITTLE HELP</span>
            </form>
            <div className="topbar-right">
              <span className="topbar-journey">
                <span className="status-dot" />
                {activeJourney?.destination_name || "Ready when you are"}
              </span>
              <button className="sos-button" onClick={() => setSOS(true)}>
                <ShieldAlert size={17} />
                <span>SOS</span>
              </button>
              <button
                className="profile-button"
                onClick={() =>
                  signedIn ? navigate("/profile") : setAuthOpen(true)
                }
              >
                <span>
                  {profile.display_name ? (
                    profile.display_name.slice(0, 1).toUpperCase()
                  ) : (
                    <UserRound size={17} />
                  )}
                </span>
                <strong>
                  {profile.display_name?.split(" ")[0] || "Sign in"}
                </strong>
              </button>
            </div>
          </header>
          {preview && (
            <div className="preview-banner">
              <Compass size={14} />
              <span>
                Design preview · Sample journey, stored only in this tab. Live
                AI and nearby services are not simulated.
              </span>
              <a href="/">Exit preview</a>
            </div>
          )}
          {!online && (
            <div className="offline-banner" role="status">
              <WifiOff size={16} />
              You’re offline. Emergency information remains available; AI and
              nearby search need a connection.
            </div>
          )}
          <main>
            <PageBoundary>
              <Suspense
                fallback={
                  <div className="page" role="status">
                    A little moment…
                  </div>
                }
              >
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Home
                        onNew={startJourney}
                        onVoice={() => openVoice()}
                        onVoiceMeal={() => openVoice("meal")}
                        onMeal={() => addEvent("meal")}
                        onFood={() => setFood(true)}
                      />
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <Chat
                        onVoice={() => openVoice()}
                        onSOS={() => setSOS(true)}
                        onNew={startJourney}
                      />
                    }
                  />
                  <Route
                    path="/journey"
                    element={
                      <JourneyPage
                        onNew={startJourney}
                        onAdd={addEvent}
                        onEdit={(e) => {
                          setEvent(e);
                          setEventOpen(true);
                        }}
                      />
                    }
                  />
                  <Route path="/nearby" element={<Nearby />} />
                  <Route
                    path="/profile"
                    element={<Profile onVoiceMeal={() => openVoice("meal")} />}
                  />
                  <Route
                    path="/auth"
                    element={
                      <Home
                        onNew={startJourney}
                        onVoice={() => openVoice()}
                        onVoiceMeal={() => openVoice("meal")}
                        onMeal={() => addEvent("meal")}
                        onFood={() => setFood(true)}
                      />
                    }
                  />
                  <Route
                    path="/privacy"
                    element={<Policies kind="privacy" />}
                  />
                  <Route path="/terms" element={<Policies kind="terms" />} />
                  <Route
                    path="*"
                    element={
                      <div className="page">
                        <h1>A little detour.</h1>
                        <p>This page isn’t here.</p>
                        <Button onClick={() => navigate("/")}>Head home</Button>
                      </div>
                    }
                  />
                </Routes>
              </Suspense>
            </PageBoundary>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {links}
        </nav>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Heart size={17} />
          {notice}
        </div>
      )}
      <Auth />
      <JourneyForm open={newJourney} onClose={() => setNewJourney(false)} />
      <EventForm
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        event={event}
        initialType={type}
        journeyId={eventJourney}
      />
      <Voice
        open={voice}
        mode={voiceMode}
        onClose={() => setVoice(false)}
        onTranscript={(text) => navigate("/chat", { state: { send: text } })}
      />
      <Food open={food} onClose={() => setFood(false)} />
      <Modal
        open={sos}
        onOpenChange={setSOS}
        title="Help, when it matters most."
        description="Don’t wait for the companion or a map if you need urgent help. Choose your current jurisdiction; these numbers apply only there."
      >
        <div className="sos-panel">
          <ShieldAlert size={40} />
          <label>
            Where are you right now?
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Choose current location</option>
              <option value="india">India</option>
              <option value="kerala">Kerala, India</option>
              <option value="other">Outside India / uncertain</option>
            </select>
          </label>
          {region === "india" || region === "kerala" ? (
            <>
              <a className="button button-danger" href="tel:112">
                <Phone size={20} />
                Call 112 · India emergency
              </a>
              {region === "kerala" && (
                <a className="button button-secondary" href="tel:108">
                  <Phone size={18} />
                  Call 108 · Kerala ambulance
                </a>
              )}
              <p className="small muted">
                Opens your device’s dialer. LINC-33 does not dispatch
                assistance.
              </p>
            </>
          ) : region === "other" ? (
            <p>
              Contact your local emergency services or ask someone nearby for
              assistance. Indian numbers must not be assumed to apply.
            </p>
          ) : null}
          <div className="sos-source-links">
            <a
              href="https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss"
              target="_blank"
              rel="noopener noreferrer"
            >
              India government source
              <ArrowUpRight size={13} />
            </a>
            <a
              href="https://kmscl.kerala.gov.in/KMSCL/index.php/ckmscl/menucontentview/50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kerala government source
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
