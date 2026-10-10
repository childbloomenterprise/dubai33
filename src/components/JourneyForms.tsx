import { useEffect, useRef, useState } from "react";
import { Compass, MapPin, Plus, Check } from "lucide-react";
import type { JourneyEvent, EventType } from "../../shared/contracts";
import { eventDraft, journeyInput } from "../../shared/contracts";
import { useLinc } from "../state";
import { Button, Modal, ErrorBox } from "./ui";

export function JourneyForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signedIn, setAuthOpen, call, refresh, notify, activeJourney } =
    useLinc();
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      onClose();
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = journeyInput.parse({
        title: title || `${destination} trip`,
        destination_name: destination,
        started_at: new Date(`${start}T00:00:00`).toISOString(),
        ended_at: end ? new Date(`${end}T23:59:59`).toISOString() : null,
      });
      await call("journeys", "POST", input);
      await refresh();
      notify("Your journey is ready. Let’s make some memories.");
      onClose();
      setTitle("");
      setDestination("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Where are we heading?"
      description="Start your journey, then tell us about the little things along the way."
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Destination
          <div className="input-icon">
            <MapPin size={18} />
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={160}
              required
              placeholder="Munnar, Kerala"
            />
          </div>
        </label>
        <label>
          Journey name <span className="muted">(optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="A little mountain escape"
          />
        </label>
        <div className="form-grid">
          <label>
            Starts
            <input
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Ends <span className="muted">(optional)</span>
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {activeJourney && (
          <p className="muted small">
            Starting a new journey will complete “{activeJourney.title}”. Its
            records remain available.
          </p>
        )}
        {error && <ErrorBox message={error} />}
        <Button type="submit" loading={busy}>
          <Compass size={18} />
          Start my journey
        </Button>
      </form>
    </Modal>
  );
}
export function EventForm({
  open,
  onClose,
  event,
  initialType = "note",
  journeyId,
}: {
  open: boolean;
  onClose: () => void;
  event: JourneyEvent | null;
  initialType?: EventType;
  journeyId?: string;
}) {
  const { activeJourney, call, refresh, notify, profile } = useLinc();
  const requestId = useRef(crypto.randomUUID());
  const [type, setType] = useState<EventType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [when, setWhen] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      requestId.current = crypto.randomUUID();
      setType(event?.event_type || initialType);
      setTitle(event?.title || "");
      setDescription(event?.description || "");
      setTime(event?.time_text || "");
      setWhen(
        event?.occurred_at
          ? new Date(
              new Date(event.occurred_at).getTime() -
                new Date(event.occurred_at).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16)
          : "",
      );
      setAmount(String(event?.metadata_json.amount_ml || ""));
      setError("");
    }
  }, [open, event, initialType]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = journeyId || event?.journey_id || activeJourney?.id;
      if (!id) throw new Error("Start a journey before saving an entry.");
      if (!profile.consents.sensitive_storage)
        throw new Error(
          "Enable private storage in Profile before saving entries.",
        );
      const draft = eventDraft.parse({
        event_type: type,
        title,
        description: description || null,
        occurred_at: when ? new Date(when).toISOString() : null,
        time_text: time || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location_name: event?.location_name || null,
        metadata_json:
          type === "hydration" && amount ? { amount_ml: Number(amount) } : {},
      });
      await call("events", event ? "PATCH" : "POST", {
        ...(event ? { id: event.id } : { request_id: requestId.current }),
        journey_id: id,
        event: draft,
      });
      requestId.current = crypto.randomUUID();
      await refresh();
      notify(event ? "Entry updated." : "Added to your journey.");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={event ? "A little correction" : "Add a little moment"}
      description="Save what happened, in your own words. Leave uncertain times blank."
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Entry type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            <option value="meal">Meal</option>
            <option value="symptom">Symptom</option>
            <option value="activity">Activity</option>
            <option value="medication_report">Medication report</option>
            <option value="hydration">Hydration</option>
            <option value="note">Note</option>
          </select>
        </label>
        <label>
          What happened?
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            required
            placeholder={
              type === "meal"
                ? "Appam for breakfast"
                : "A moment worth remembering"
            }
          />
        </label>
        <label>
          Details <span className="muted">(optional)</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </label>
        <div className="form-grid">
          <label>
            Known date & time
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>
          <label>
            Or approximate time
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Around lunchtime"
              maxLength={160}
            />
          </label>
        </div>
        {type === "hydration" && (
          <label>
            Amount in ml <span className="muted">(optional)</span>
            <input
              type="number"
              min="1"
              max="20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        {error && <ErrorBox message={error} />}
        <Button loading={busy} type="submit">
          {event ? <Check size={18} /> : <Plus size={18} />}Save entry
        </Button>
      </form>
    </Modal>
  );
}
