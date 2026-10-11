import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type Context as ReactContext,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { Journey, JourneyEvent, ProfileState } from "../shared/contracts";
import { request, supabase } from "./lib/client";

const emptyProfile: ProfileState = {
  display_name: "",
  profile: null,
  consents: { sensitive_storage: false, external_ai: false },
};
type LincState = {
  session: Session | null;
  signedIn: boolean;
  preview: boolean;
  authReady: boolean;
  authConfigured: boolean;
  journeys: Journey[];
  activeJourney: Journey | null;
  events: JourneyEvent[];
  profile: ProfileState;
  busy: boolean;
  dataError: Error | null;
  notice: string | null;
  recovery: boolean;
  call: <T>(route: string, method?: string, body?: unknown) => Promise<T>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  signOut: () => Promise<void>;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  completeRecovery: () => void;
};
const Context: ReactContext<LincState | null> =
  import.meta.hot?.data.context || createContext<LincState | null>(null);
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.context = Context;
  });
const isPreview =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("preview") === "1";
let previewAPI: Promise<typeof import("./lib/preview")> | null = null;
export function LincProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setReady] = useState(!supabase);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [recovery, setRecovery] = useState(
    window.location.pathname === "/auth",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        setNotice("Could not restore your session. Please sign in again.");
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setReady(true);
      if (
        event === "PASSWORD_RECOVERY" ||
        (window.location.pathname === "/auth" && newSession)
      ) {
        setRecovery(true);
        setAuthOpen(true);
      }
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const call = useCallback(
    async <T,>(route: string, method?: string, body?: unknown): Promise<T> => {
      if (isPreview) {
        if (import.meta.env.DEV) {
          previewAPI ||= import("./lib/preview");
          return (await previewAPI).previewRequest<T>(route, method, body);
        }
      }
      try {
        return await request<T>(route, method, body);
      } catch (error) {
        if ((error as { status?: number }).status === 401) setAuthOpen(true);
        throw error;
      }
    },
    [],
  );
  const enabled = !!session || isPreview;
  const scope = isPreview ? "preview" : session?.user.id || "guest";
  const journeys = useQuery({
    queryKey: [scope, "journeys"],
    queryFn: () => call<Journey[]>("journeys"),
    enabled,
    retry: false,
  });
  const profile = useQuery({
    queryKey: [scope, "profile"],
    queryFn: () => call<ProfileState>("health-context"),
    enabled,
    retry: false,
  });
  const activeJourney =
    journeys.data?.find((j) => j.status === "active") || null;
  const events = useQuery({
    queryKey: [scope, "events", activeJourney?.id],
    queryFn: () =>
      call<JourneyEvent[]>(`events?journey_id=${activeJourney!.id}`),
    enabled: enabled && !!activeJourney,
    retry: false,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries();
  };
  return (
    <Context.Provider
      value={{
        session,
        signedIn: enabled,
        preview: isPreview,
        authReady,
        authConfigured: !!supabase,
        journeys: journeys.data || [],
        activeJourney,
        events: events.data || [],
        profile: profile.data || emptyProfile,
        busy: journeys.isFetching || profile.isFetching || events.isFetching,
        dataError: journeys.error || profile.error || events.error,
        notice,
        recovery,
        call,
        refresh,
        notify: setNotice,
        signOut: async () => {
          if (supabase) await supabase.auth.signOut();
          queryClient.clear();
          setRecovery(false);
        },
        authOpen,
        setAuthOpen,
        onboardingOpen,
        setOnboardingOpen,
        completeRecovery: () => setRecovery(false),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLinc() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing Linc provider");
  return context;
}
