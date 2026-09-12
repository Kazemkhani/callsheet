import { describe, expect, it } from "vitest";

import {
  ACTION_ADJUST,
  ACTION_APPROVE,
  completeMessage,
  confirmationLine,
  fillMessage,
  rosterMessage,
  statusMessage,
  type SlackBlock,
} from "./blocks";
import { makeState } from "./fixtures";
import { areaLine, briefLines, eventLine, meter, stageWords, tallyByArea, totalSlots } from "./format";

function textOf(blocks: SlackBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "section") return (block.text as { text: string }).text;
      if (block.type === "context") {
        return (block.elements as { text: string }[]).map((e) => e.text).join("\n");
      }
      return "";
    })
    .join("\n");
}

describe("format", () => {
  it("renders the meter at the requested width", () => {
    expect(meter(36, 60)).toBe("██████░░░░ 36/60 confirmed");
    expect(meter(0, 60)).toBe("░░░░░░░░░░ 0/60 confirmed");
    expect(meter(60, 60)).toBe("██████████ 60/60 confirmed");
  });

  it("puts every stage into words", () => {
    expect(stageWords("researching")).toBe("researching the event");
    expect(stageWords("awaiting_approval")).toBe("waiting for your approval");
    expect(stageWords("collecting_replies")).toBe("collecting replies");
  });

  it("renders an event as one short mono-ready line", () => {
    const line = eventLine(makeState().events[0]);
    expect(line).toBe("14:00 research_event Exa: 3 sources, venue resolved to ADNEC");
  });

  it("marks warnings and errors", () => {
    expect(eventLine(makeState().events[2])).toContain("! verify_experience");
  });

  it("flags a corrected venue", () => {
    const lines = briefLines(makeState().brief!);
    expect(lines).toContain("Venue as stated: ADNOC Centre");
    expect(lines).toContain("Venue corrected: ADNEC, Abu Dhabi");
    expect(lines.join("\n")).toContain("AED 297 per 8.5h shift");
    expect(lines.join("\n")).toContain("Training: 5 Oct 2026, 2h, on site, mandatory");
  });

  it("keeps the stated venue when Exa agreed", () => {
    const state = makeState();
    const brief = { ...state.brief!, verifiedVenue: "ADNOC Centre" };
    expect(briefLines(brief)).toContain("Venue: ADNOC Centre, Abu Dhabi");
  });

  it("tallies each area", () => {
    const state = makeState();
    const tallies = tallyByArea(state.brief, state.offers);
    expect(tallies).toHaveLength(6);
    expect(areaLine(tallies[0])).toBe("Stage 10/10 proposed, 2 waitlisted, 1 first-timer slot");
    expect(totalSlots(state.brief, state.offers)).toBe(60);
  });
});

describe("statusMessage", () => {
  it("leads with the stage in words and carries the brief", () => {
    const message = statusMessage(makeState({ stage: "researching" }));
    expect(message.text).toBe("Callsheet is on it. Stage: researching the event");
    const body = textOf(message.blocks);
    expect(body).toContain("Venue corrected: ADNEC");
    expect(body).toContain("Dates: 6 Oct 2026, 7 Oct 2026, 08:30 to 18:00");
  });

  it("shows at most the last six events", () => {
    const state = makeState();
    const many = Array.from({ length: 12 }, (_, i) => ({ ...state.events[0], id: `x${i}`, message: `step ${i}` }));
    const body = textOf(statusMessage(makeState({ events: many })).blocks);
    expect(body).toContain("step 11");
    expect(body).toContain("step 6");
    expect(body).not.toContain("step 5");
  });

  it("survives a state with no brief yet", () => {
    const message = statusMessage(makeState({ brief: null, stage: "researching" }));
    expect(message.blocks.length).toBeGreaterThan(0);
    expect(textOf(message.blocks)).not.toContain("Venue");
  });
});

describe("rosterMessage", () => {
  it("gives a per-area line, three named picks and both buttons", () => {
    const message = rosterMessage(makeState());
    const body = textOf(message.blocks);

    expect(message.text).toContain("60 proposed, 12 waitlisted");
    expect(body).toContain("Stage 10/10 proposed, 2 waitlisted, 1 first-timer slot");
    expect(body).toContain("• Omar Tageldin (verified): Two seasons on this exact stage");
    expect(body).toContain("Info Desk 10/10 proposed");

    const actions = message.blocks.find((b) => b.type === "actions") as SlackBlock;
    const elements = actions.elements as { action_id: string; value: string; text: { text: string } }[];
    expect(elements.map((e) => e.action_id)).toEqual([ACTION_APPROVE, ACTION_ADJUST]);
    expect(elements[0].text.text).toBe("Approve and send offers");
    expect(elements.every((e) => e.value === "run-123")).toBe(true);
  });

  it("tags verification only where the usher has verified events", () => {
    const state = makeState();
    const picks = textOf(rosterMessage(state).blocks);
    expect(picks).toContain("• Usher 1: Area skill match");
    expect(picks).not.toContain("• Usher 1 (verified)");
  });
});

describe("fillMessage and completeMessage", () => {
  it("renders the meter plus the newest confirmations", () => {
    const state = makeState();
    let left = 36;
    const offers = state.offers.map((o) => {
      if (o.status === "proposed" && left > 0) {
        left -= 1;
        return { ...o, status: "confirmed" as const };
      }
      return o;
    });
    const withConfirmed = makeState({ offers, stage: "collecting_replies" });
    const message = fillMessage(withConfirmed, [confirmationLine(withConfirmed, offers[0])]);

    expect(message.text).toBe("██████░░░░ 36/60 confirmed");
    expect(textOf(message.blocks)).toContain("Omar Tageldin confirmed Stage");
  });

  it("reports the call sheet link and the workspace line", () => {
    const offers = makeState().offers.map((o) => (o.status === "proposed" ? { ...o, status: "confirmed" as const } : o));
    const body = textOf(completeMessage(makeState({ offers, stage: "complete" })).blocks);
    expect(body).toContain("Call sheet ready. 60/60 confirmed.");
    expect(body).toContain("<https://app.ambiguous.ai/docs/callsheet-123|Open the call sheet>");
    expect(body).toContain("Ambiguous: 24 contacts, 61 tasks, mailbox callsheet@agent.ambiguous.ai");
  });

  it("says so when the workspace never connected", () => {
    const state = makeState({ workspace: { connected: false, lastSyncError: "401 from app.ambiguous.ai" } });
    expect(textOf(completeMessage(state).blocks)).toContain("Ambiguous: not connected. 401 from app.ambiguous.ai");
  });
});
