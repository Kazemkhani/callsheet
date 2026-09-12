"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { SLIDE_COUNT, SLIDE_TITLES } from "@/lib/present/deck";
import {
  CloseSlide,
  FairSlide,
  IdeaSlide,
  LiveSlide,
  LoopSlide,
  OtherSideSlide,
  PersonSlide,
  ProblemSlide,
  TitleSlide,
  UnderTheHoodSlide,
  WhereItLivesSlide,
} from "@/components/present/Slides";

const LIVE_SLIDE = 8;

type AgentStatus =
  | { kind: "idle" }
  | { kind: "ready"; stage: string }
  | { kind: "offline" };

/** The run stage is the only field the deck reads, so it is narrowed here rather
 *  than pulling the whole console state type into the presentation layer. */
function readStage(payload: unknown): string {
  if (payload !== null && typeof payload === "object" && "stage" in payload) {
    const stage = (payload as { stage: unknown }).stage;
    if (typeof stage === "string" && stage.length > 0) return stage;
  }
  return "unknown";
}

export default function PresentPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-ink" />}>
      <Deck />
    </Suspense>
  );
}

function Deck() {
  // ?s=3 jumps straight to a slide, so the presenter can reopen mid-talk and a
  // screenshot run can address one slide at a time. Read once, as the opening
  // position: after that the deck is driven by the keyboard, not the URL.
  const requested = useSearchParams().get("s");
  const [index, setIndex] = useState(() => {
    const asNumber = Number.parseInt(requested ?? "", 10);
    if (!Number.isFinite(asNumber)) return 0;
    return Math.min(SLIDE_COUNT - 1, Math.max(0, asNumber - 1));
  });
  const [agent, setAgent] = useState<AgentStatus>({ kind: "idle" });

  const go = useCallback((next: number) => {
    setIndex(Math.min(SLIDE_COUNT - 1, Math.max(0, next)));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          event.preventDefault();
          setIndex((i) => Math.min(SLIDE_COUNT - 1, i + 1));
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          setIndex((i) => Math.max(0, i - 1));
          break;
        case "Home":
          event.preventDefault();
          setIndex(0);
          break;
        case "End":
          event.preventDefault();
          setIndex(SLIDE_COUNT - 1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          if (document.fullscreenElement === null) {
            void document.documentElement.requestFullscreen().catch(() => {});
          } else {
            void document.exitFullscreen().catch(() => {});
          }
          break;
        case "Escape":
          if (document.fullscreenElement !== null) {
            void document.exitFullscreen().catch(() => {});
          }
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The live slide states whether the agent is actually answering. It is read
  // once, from the real endpoint, and says "offline" rather than guessing.
  useEffect(() => {
    if (index !== LIVE_SLIDE || agent.kind !== "idle") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/state", {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) throw new Error(String(response.status));
        const payload: unknown = await response.json();
        if (!cancelled) setAgent({ kind: "ready", stage: readStage(payload) });
      } catch {
        if (!cancelled) setAgent({ kind: "offline" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [index, agent.kind]);

  const status =
    agent.kind === "ready" ? (
      <p className="deck-meta mt-[clamp(1rem,2.5vh,1.75rem)] font-mono text-ink-olive">
        agent ready, stage: {agent.stage}
      </p>
    ) : agent.kind === "offline" ? (
      <p className="deck-meta mt-[clamp(1rem,2.5vh,1.75rem)] font-mono text-signal">
        agent offline
      </p>
    ) : null;

  const slides = [
    <TitleSlide key="title" />,
    <PersonSlide key="person" />,
    <ProblemSlide key="problem" />,
    <OtherSideSlide key="other" />,
    <IdeaSlide key="idea" />,
    <WhereItLivesSlide key="where" />,
    <LoopSlide key="loop" />,
    <FairSlide key="fair" />,
    <LiveSlide key="live" status={status} />,
    <UnderTheHoodSlide key="hood" />,
    <CloseSlide key="close" />,
  ];

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-ink text-paper">
      <section className="relative z-0 min-h-0 flex-1 px-[clamp(1.5rem,4vw,4rem)] pt-[clamp(2rem,7vh,5rem)] pb-[clamp(1rem,3vh,2rem)]">
        <div key={index} className="deck-rise h-full">
          {slides[index]}
        </div>
      </section>

      <footer className="relative z-20 px-[clamp(1.5rem,4vw,4rem)] pb-[clamp(0.75rem,1.6vh,1.25rem)]">
        <p className="text-right font-mono text-[0.8125rem] leading-5 tabular-nums text-ink-label">
          {String(index + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
        </p>
        <div className="mt-[clamp(0.5rem,1.2vh,0.875rem)] flex gap-[3px]">
          {SLIDE_TITLES.map((name, i) => (
            <span
              key={name}
              aria-hidden="true"
              className={`h-[2px] flex-1 ${
                i === index ? "bg-signal" : "bg-ink-rule"
              }`}
            />
          ))}
        </div>
      </footer>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
        className="absolute inset-y-0 left-0 z-10 w-[15%] cursor-w-resize"
      />
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
        className="absolute inset-y-0 right-0 z-10 w-[30%] cursor-e-resize"
      />
    </main>
  );
}
