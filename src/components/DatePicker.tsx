import { useEffect, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** `yyyy-MM-dd` only — parsed as a local date, never shifted by timezone. */
function parseDay(value: string) {
  return parseISO(value);
}

/**
 * Apple-style calendar popover for picking a single day. Replaces native
 * `<input type="date">` so date entry is a tap, not typing.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() =>
    value ? parseDay(value) : new Date(),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setCursor(value ? parseDay(value) : new Date());
  }, [open, value]);

  const selected = value ? parseDay(value) : null;
  const minDate = min ? parseDay(min) : null;
  const maxDate = max ? parseDay(max) : null;

  const gridStart = startOfWeek(startOfMonth(cursor));
  const gridEnd = endOfWeek(endOfMonth(cursor));
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  function pick(day: Date) {
    if (minDate && isBefore(day, minDate)) return;
    if (maxDate && isAfter(day, maxDate)) return;
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <div className="date-picker" ref={ref}>
      <button
        type="button"
        className="date-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={16} />
        {selected ? format(selected, "EEE, MMM d, yyyy") : placeholder}
      </button>
      {open && (
        <div
          className="date-picker-pop"
          role="dialog"
          aria-label="Choose a date"
        >
          <div className="date-picker-head">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor((c) => subMonths(c, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <strong>{format(cursor, "MMMM yyyy")}</strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {days.map((day) => {
              const disabled =
                (!!minDate && isBefore(day, minDate)) ||
                (!!maxDate && isAfter(day, maxDate));
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  disabled={disabled}
                  className={cn(
                    "date-picker-day",
                    !isSameMonth(day, cursor) && "outside",
                    selected && isSameDay(day, selected) && "selected",
                    isSameDay(day, new Date()) && "today",
                  )}
                  onClick={() => pick(day)}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="date-picker-today"
            onClick={() => pick(new Date())}
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
