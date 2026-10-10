import type { ChatResult } from "./contracts.js";
import { isHealthText, screenSafety } from "./safety.js";
import { retrieveSources } from "./knowledge.js";
export function sourceReply(text: string, forceHealth = false): ChatResult {
  const safety = screenSafety(text);
  const refs = retrieveSources(text);
  const health = forceHealth || isHealthText(text) || safety.urgency !== "none";
  return {
    reply:
      safety.message ||
      (refs.length
        ? "I can show your recent records alongside general health information. Timing alone cannot establish what caused your symptoms. Open the sources below for their guidance, and contact a healthcare professional for advice specific to you."
        : "I cannot assess or diagnose this concern. A healthcare professional can give advice specific to you. You can review your records or find nearby help."),
    intent: health ? "health" : "travel",
    conversation_id: null,
    events: [],
    medical_context: {
      contains_health_guidance: health,
      urgency: safety.urgency === "none" && health ? "routine" : safety.urgency,
      source_ids: refs.map((x) => x.id),
    },
    actions: health
      ? [
          {
            type: safety.urgency === "emergency" ? "sos" : "nearby",
            label:
              safety.urgency === "emergency"
                ? "Emergency assistance"
                : "Find nearby help",
          },
        ]
      : [],
  };
}
