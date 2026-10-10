// Development only: dynamically imported under import.meta.env.DEV.
// Synthetic data is never used as a provider fallback and is not included in production JS.
import type {
  Journey,
  JourneyEvent,
  Message,
  ChatResult,
  ProfileState,
} from "../../shared/contracts";
import { eventDraft } from "../../shared/contracts";
import { sourceReply } from "./sourceReply";
const uid = "00000000-0000-4000-a000-000000000001";
const jid = "00000000-0000-4000-a000-000000000002";
const now = new Date();
const date = (hour: number, days = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
let journeys: Journey[] = [
  {
    id: jid,
    user_id: uid,
    title: "Munnar escape",
    destination_name: "Munnar, Kerala",
    started_at: date(8, 2),
    ended_at: new Date(now.getTime() + 4 * 86400000).toISOString(),
    status: "active",
    created_at: date(8, 2),
  },
];
let events: JourneyEvent[] = [
  {
    type: "meal",
    title: "Appam & vegetable stew",
    hour: 8,
    note: "Breakfast at the homestay",
  },
  {
    type: "activity",
    title: "A walk through the tea gardens",
    hour: 10,
    note: "Cool air, slow morning",
  },
  { type: "hydration", title: "A bottle of water", hour: 11, note: "500 ml" },
  {
    type: "meal",
    title: "Kerala meals",
    hour: 13,
    note: "Lunch in Munnar town",
  },
].map((x) => ({
  ...eventDraft.parse({
    event_type: x.type,
    title: x.title,
    description: x.note,
    occurred_at: date(x.hour),
    metadata_json: x.type === "hydration" ? { amount_ml: 500 } : {},
  }),
  id: crypto.randomUUID(),
  user_id: uid,
  journey_id: jid,
  created_at: date(x.hour),
  source_message_id: null,
}));
let messages: Message[] = [];
let profile: ProfileState = {
  display_name: "Alex",
  profile: null,
  consents: { sensitive_storage: true, external_ai: true },
};
const results = new Map<string, unknown>();
export async function previewRequest<T>(
  route: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const url = new URL(`http://preview/${route}`);
  const payload = body as Record<string, any> | undefined;
  let value: unknown;
  if (url.pathname === "/journeys") {
    if (method === "POST") {
      journeys.forEach((j) => (j.status = "completed"));
      const j = {
        ...payload,
        id: crypto.randomUUID(),
        user_id: uid,
        status: "active",
        created_at: now.toISOString(),
      } as Journey;
      journeys.unshift(j);
      value = j;
    } else if (method === "DELETE") {
      const id = url.searchParams.get("id");
      journeys = journeys.filter((j) => j.id !== id);
      events = events.filter((e) => e.journey_id !== id);
      value = { success: true };
    } else if (method === "PATCH") {
      if (payload?.status === "active")
        journeys.forEach((j) => (j.status = "completed"));
      const j = journeys.find((j) => j.id === payload?.id);
      if (j) j.status = payload!.status;
      value = j;
    } else value = journeys;
  } else if (url.pathname === "/events") {
    if (method === "GET")
      value = events.filter(
        (e) => e.journey_id === url.searchParams.get("journey_id"),
      );
    else if (method === "DELETE") {
      events = events.filter((e) => e.id !== url.searchParams.get("id"));
      value = { success: true };
    } else if (method === "PATCH") {
      const e = events.find((e) => e.id === payload?.id);
      if (e) Object.assign(e, payload?.event);
      value = e;
    } else {
      if (results.has(payload!.request_id))
        return results.get(payload!.request_id) as T;
      const e = {
        ...payload!.event,
        id: crypto.randomUUID(),
        user_id: uid,
        journey_id: payload!.journey_id,
        created_at: new Date().toISOString(),
        source_message_id: null,
      };
      events.push(e);
      value = e;
      results.set(payload!.request_id, e);
    }
  } else if (url.pathname === "/health-context") {
    if (method === "PATCH")
      profile = {
        ...profile,
        display_name: payload!.display_name,
        profile: payload as any,
      };
    value = profile;
  } else if (url.pathname === "/privacy") {
    if (method === "POST")
      profile.consents[
        payload!.consent_type as "sensitive_storage" | "external_ai"
      ] = payload!.granted;
    value = { success: true };
  } else if (url.pathname === "/conversations")
    value = url.searchParams.has("id") ? messages : [];
  else if (url.pathname === "/chat") {
    if (results.has(payload!.request_id))
      return results.get(payload!.request_id) as T;
    const text = payload!.text as string;
    const result: ChatResult = sourceReply(text);
    if (!result.medical_context.contains_health_guidance) {
      const type = /ate|had|lunch|breakfast|dinner|meal/i.test(text)
        ? "meal"
        : /drank|water/i.test(text)
          ? "hydration"
          : "note";
      const draft = eventDraft.parse({
        event_type: type,
        title: text.slice(0, 150),
        timezone: payload!.timezone,
      });
      if (payload!.journey_id && profile.consents.sensitive_storage) {
        const e = {
          ...draft,
          id: crypto.randomUUID(),
          journey_id: payload!.journey_id,
          user_id: uid,
          created_at: new Date().toISOString(),
          source_message_id: null,
        };
        events.push(e);
        result.events = [{ status: "saved", event: e }];
        result.reply =
          "Added to this sample journey. In the connected app, Gemini understands your message and saves validated events.";
      } else {
        result.reply =
          "This is a development preview. Connect the services for the real companion.";
      }
    }
    result.recent_events = events.slice(-4);
    result.conversation_id = jid;
    messages.push(
      {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        result,
        created_at: new Date().toISOString(),
      },
    );
    value = result;
    results.set(payload!.request_id, result);
  } else
    throw new Error("This live integration is unavailable in design preview.");
  return structuredClone(value) as T;
}
