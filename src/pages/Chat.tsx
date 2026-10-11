import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Bot,
  Plus,
  History,
  Trash2,
  Check,
  Compass,
  ExternalLink,
  ShieldAlert,
  LoaderCircle,
  CornerUpLeft,
} from "lucide-react";
import type {
  ChatResult,
  Message,
  Conversation,
  EventDraft,
} from "../../shared/contracts";
import { screenSafety, isHealthText } from "../../shared/safety";
import { sources } from "../../shared/knowledge";
import { sourceReply } from "../lib/sourceReply";
import {
  listLocalConversations,
  getLocalConversation,
  saveLocalConversation,
  deleteLocalConversation,
} from "../lib/localChat";
import { useLinc } from "../state";
import { Button, ErrorBox, Modal } from "../components/ui";

export function Chat({
  onVoice,
  onSOS,
  onNew,
}: {
  onVoice: () => void;
  onSOS: () => void;
  onNew: () => void;
}) {
  const {
    call,
    activeJourney,
    refresh,
    signedIn,
    setAuthOpen,
    preview,
    session,
  } = useLinc();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{
    text: string;
    request_id: string;
  } | null>(null);
  const [history, setHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [urgent, setUrgent] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const consumed = useRef<string | null>(null);
  const [conversationJourney, setConversationJourney] = useState<string | null>(
    null,
  );
  const pendingRequests = useRef(new Map<string, string>());
  const identity = preview ? "preview" : session?.user.id || "guest";
  const identityRef = useRef(identity);
  const previousIdentity = useRef(identity);
  identityRef.current = identity;
  useEffect(() => {
    if (previousIdentity.current === identity) return;
    previousIdentity.current = identity;
    setMessages([]);
    setConversation(null);
    setConversationJourney(null);
    setRetry(null);
    pendingRequests.current.clear();
  }, [identity]);
  useEffect(() => {
    if (!signedIn && conversationId && messages.length)
      saveLocalConversation(conversationId, messages);
  }, [signedIn, conversationId, messages]);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "end",
    });
  }, [messages, busy]);
  async function send(value: string, requestId: string = crypto.randomUUID()) {
    if (busy || !value.trim()) return;
    const safety = screenSafety(value);
    setUrgent(safety.message);
    if (!signedIn && !isHealthText(value) && safety.urgency === "none") {
      setAuthOpen(true);
      return;
    }
    setText("");
    setError("");
    setRetry(null);
    setBusy(true);
    const guestConversationId =
      !signedIn && !conversationId ? crypto.randomUUID() : conversationId;
    if (!signedIn && guestConversationId !== conversationId)
      setConversation(guestConversationId);
    setMessages((previous) =>
      previous.some((m) => m.id === requestId)
        ? previous
        : [
            ...previous,
            {
              id: requestId,
              role: "user",
              content: value,
              created_at: new Date().toISOString(),
            },
          ],
    );
    const sender = identity;
    try {
      const journeyId = conversationId
        ? conversationJourney
        : activeJourney?.id || null;
      const result = signedIn
        ? await call<ChatResult>("chat", "POST", {
            text: value,
            request_id: requestId,
            conversation_id: conversationId,
            journey_id: journeyId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : {
            ...sourceReply(value),
            persistence_error:
              "Saved on this device only. Sign in to sync your history and journey entries across devices.",
          };
      if (identityRef.current !== sender) return;
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          result,
          created_at: new Date().toISOString(),
        },
      ]);
      if (result.conversation_id) {
        setConversation(result.conversation_id);
        setConversationJourney(journeyId);
      }
      if (signedIn) await refresh();
    } catch (err) {
      setError((err as Error).message);
      setRetry({ text: value, request_id: requestId });
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const initial = location.state as { send?: string; draft?: string } | null;
    if (initial?.draft) setText(initial.draft);
    if (initial?.send && consumed.current !== location.key) {
      consumed.current = location.key;
      void send(initial.send);
      navigate("/chat", { replace: true, state: null });
    }
  }, [location.key]);
  async function openHistory() {
    setHistory(true);
    setError("");
    if (!signedIn) {
      setConversations(listLocalConversations());
      return;
    }
    try {
      setConversations(await call<Conversation[]>("conversations"));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function resume(id: string) {
    try {
      if (!signedIn) {
        setMessages(getLocalConversation(id));
        setConversation(id);
        setConversationJourney(null);
        setHistory(false);
        setUrgent(null);
        setRetry(null);
        return;
      }
      setMessages(await call<Message[]>(`conversations?id=${id}`));
      setConversation(id);
      setConversationJourney(
        conversations.find((c) => c.id === id)?.journey_id || null,
      );
      setHistory(false);
      setUrgent(null);
      setRetry(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function deleteConversation() {
    if (!deleteId) return;
    try {
      if (!signedIn) deleteLocalConversation(deleteId);
      else await call(`conversations?id=${deleteId}`, "DELETE");
      if (conversationId === deleteId) {
        setMessages([]);
        setConversation(null);
      }
      setDeleteId(null);
      await openHistory();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function action(type: string) {
    if (type === "sos") onSOS();
    else if (type === "nearby") navigate("/nearby");
    else if (type === "start_journey") onNew();
    else if (type === "view_timeline") navigate("/journey");
  }
  async function savePending(event: EventDraft, key: string) {
    const journeyId = conversationId ? conversationJourney : activeJourney?.id;
    if (!journeyId) {
      onNew();
      return;
    }
    setSaving(key);
    try {
      if (!pendingRequests.current.has(key))
        pendingRequests.current.set(key, crypto.randomUUID());
      const saved = await call<{ id: string }>("events", "POST", {
        request_id: pendingRequests.current.get(key),
        journey_id: journeyId,
        event: { ...event, confidence: 1 },
      });
      setMessages((previous) =>
        previous.map((m) =>
          m.result
            ? {
                ...m,
                result: {
                  ...m.result,
                  events: m.result.events.map((x) =>
                    x.event === event
                      ? { status: "saved", event: { ...event, id: saved.id } }
                      : x,
                  ),
                },
              }
            : m,
        ),
      );
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }
  async function undo(id: string) {
    try {
      await call(`events?id=${id}`, "DELETE");
      setMessages((previous) =>
        previous.map((m) =>
          m.result
            ? {
                ...m,
                result: {
                  ...m.result,
                  events: m.result.events.filter((e) => e.event.id !== id),
                },
              }
            : m,
        ),
      );
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="chat-page">
      <div className="chat-heading">
        <button
          className="icon-button"
          aria-label="Back to home"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={21} />
        </button>
        <div className="chat-avatar">
          <Bot size={23} />
        </div>
        <div>
          <h1>LINC-33</h1>
          <span>
            {preview
              ? "Development preview"
              : activeJourney
                ? `Along for your ${activeJourney.destination_name} journey`
                : "Your companion, along the way"}
          </span>
        </div>
        <div className="chat-heading-actions">
          <button
            className="icon-button"
            onClick={openHistory}
            aria-label="Conversation history"
          >
            <History size={19} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setMessages([]);
              setConversation(null);
              setRetry(null);
              setUrgent(null);
            }}
            aria-label="New conversation"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      {urgent && (
        <div className="urgent-banner" role="alert">
          <ShieldAlert size={22} />
          <div>
            <strong>Don’t wait for this conversation.</strong>
            <p>{urgent}</p>
          </div>
          <Button variant="danger" onClick={onSOS}>
            Emergency access
          </Button>
        </div>
      )}
      <div className="messages-scroll">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-bot">
              <Bot size={48} />
            </div>
            <span className="eyebrow">A LITTLE COMPANY, WHEREVER YOU GO</span>
            <h2>What’s on your mind?</h2>
            <p>
              A meal to remember, a question about your trip,
              <br />
              or just a little help along the way.
            </p>
            <div className="chat-prompts">
              {[
                "I just had lunch.",
                "What can I explore in Munnar?",
                "I’m not feeling well.",
              ].map((prompt) => (
                <button key={prompt} onClick={() => setText(prompt)}>
                  {prompt}
                  <ArrowUpIcon />
                </button>
              ))}
            </div>
            <small className="muted">
              General health information, not diagnosis or personalized
              treatment.
            </small>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              {message.role === "assistant" && (
                <div className="message-avatar">
                  <Bot size={19} />
                </div>
              )}
              <div className="message-column">
                <div className="message-bubble">{message.content}</div>
                {message.result && (
                  <>
                    {message.result.persistence_error && (
                      <p className="message-note">
                        {message.result.persistence_error}
                      </p>
                    )}
                    {message.result.events.map((entry, index) => (
                      <div
                        className="saved-event-card"
                        key={entry.event.id || index}
                      >
                        <div>
                          <span className="mini-icon green">
                            {entry.status === "saved" ? (
                              <Check size={17} />
                            ) : (
                              <Compass size={17} />
                            )}
                          </span>
                          <span>
                            <strong>{entry.event.title}</strong>
                            <small>
                              {entry.status === "saved"
                                ? "Saved to journey"
                                : "Check this extracted entry before saving"}
                            </small>
                          </span>
                        </div>
                        {entry.status === "saved" && entry.event.id ? (
                          <button
                            className="text-link"
                            onClick={() => void undo(entry.event.id!)}
                          >
                            <CornerUpLeft size={14} />
                            Undo
                          </button>
                        ) : (
                          <Button
                            variant="secondary"
                            loading={saving === `${message.id}-${index}`}
                            onClick={() =>
                              savePending(entry.event, `${message.id}-${index}`)
                            }
                          >
                            Confirm & save
                          </Button>
                        )}
                      </div>
                    ))}
                    {message.result.recent_events?.length &&
                    message.result.medical_context.contains_health_guidance ? (
                      <details className="context-details">
                        <summary>
                          Recent reported moments ·{" "}
                          {message.result.recent_events.length}
                        </summary>
                        <ul>
                          {message.result.recent_events.map((e) => (
                            <li key={e.id}>
                              {e.title}
                              {e.time_text ? ` · ${e.time_text}` : ""}
                            </li>
                          ))}
                        </ul>
                        <small>
                          Reported facts. This does not establish a cause.
                        </small>
                      </details>
                    ) : null}
                    {!!message.result.historical_events?.length && (
                      <details className="context-details">
                        <summary>
                          Earlier reported symptoms ·{" "}
                          {message.result.historical_events.length}
                        </summary>
                        <ul>
                          {message.result.historical_events.map((e) => (
                            <li key={e.id}>
                              {e.title} ·{" "}
                              {new Date(
                                e.occurred_at || e.created_at,
                              ).toLocaleDateString()}
                            </li>
                          ))}
                        </ul>
                        <small>
                          Earlier records, not a diagnosis or an inferred
                          connection.
                        </small>
                      </details>
                    )}
                    {message.result.medical_context.source_ids.length > 0 && (
                      <div className="source-cards">
                        {message.result.medical_context.source_ids
                          .map((id) => sources.find((s) => s.id === id))
                          .filter(Boolean)
                          .map((source) => (
                            <a
                              key={source!.id}
                              href={source!.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span>{source!.organization}</span>
                              <strong>
                                {source!.topic}
                                <ExternalLink size={13} />
                              </strong>
                              <p>{source!.summary}</p>
                            </a>
                          ))}
                      </div>
                    )}
                    {message.result.actions.length > 0 && (
                      <div className="message-actions">
                        {message.result.actions.map((a) => (
                          <Button
                            key={a.type}
                            variant="secondary"
                            onClick={() => action(a.type)}
                          >
                            {a.label}
                            <ArrowRight size={14} />
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <time className="message-time">
                  {new Date(message.created_at).toLocaleTimeString("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="thinking">
            <Bot size={17} />
            <LoaderCircle size={16} className="spin" />A little moment…
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="chat-bottom">
        {error && (
          <ErrorBox
            message={error}
            retry={
              retry ? () => void send(retry.text, retry.request_id) : undefined
            }
          />
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <button
            type="button"
            className="icon-button"
            aria-label="Record voice message"
            onClick={onVoice}
          >
            <Mic size={21} />
          </button>
          <textarea
            aria-label="Message LINC-33"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            placeholder="Tell me a little about your day…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button
            className="send-button"
            aria-label="Send message"
            disabled={busy || !text.trim()}
          >
            <ArrowRight size={21} />
          </button>
        </form>
        <p>
          General information only. For urgent concerns, use emergency access.
        </p>
      </div>
      <Modal
        open={history}
        onOpenChange={setHistory}
        title="Pick up where you left off"
        description={
          signedIn
            ? "Your saved conversations. Deleting a conversation also removes events extracted from its messages."
            : "Saved on this device. Sign in to sync your history across devices."
        }
      >
        {error && <ErrorBox message={error} />}
        <div className="conversation-list">
          {conversations.length ? (
            conversations.map((c) => (
              <div key={c.id}>
                <button onClick={() => resume(c.id)}>
                  <History size={19} />
                  <span>
                    <strong>{c.title || "A conversation"}</strong>
                    <small>{new Date(c.updated_at).toLocaleDateString()}</small>
                  </span>
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete conversation"
                  onClick={() => setDeleteId(c.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">No saved conversations yet.</p>
          )}
        </div>
      </Modal>
      <Modal
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete this conversation?"
        description="Messages and events extracted from this conversation will be deleted."
      >
        <Button variant="danger" onClick={deleteConversation}>
          Delete conversation
        </Button>
      </Modal>
    </div>
  );
}
function ArrowUpIcon() {
  return <ArrowRight size={15} />;
}
