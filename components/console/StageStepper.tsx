"use client";

import type { RunStage } from "@/lib/types";
import { STAGE_STEPS, stageStepIndex } from "@/lib/ui/roster";

/**
 * Eight segments of one track, set on the charcoal band. Done is olive, the step
 * running now is paper, the rest stay at band-rule weight: the coordinator can
 * see where the agent is without reading a word.
 */
export function StageStepper({ stage }: { stage: RunStage }) {
  const current = stageStepIndex(stage);
  const failed = stage === "failed";

  return (
    <div>
      <ol className="flex w-full gap-1.5" aria-label="Agent progress">
        {STAGE_STEPS.map((step, index) => {
          const done = !failed && current > index;
          const active = !failed && current === index;
          return (
            <li
              key={step}
              className="min-w-0 flex-1"
              aria-current={active ? "step" : undefined}
            >
              <span
                aria-hidden="true"
                className={`stage-motion block h-[3px] ${
                  done ? "bg-ink-olive" : active ? "bg-paper" : "bg-ink-rule"
                }`}
              />
              <span
                className={`stage-motion label-caps mt-2 block truncate ${
                  done
                    ? "text-ink-olive"
                    : active
                      ? "font-medium text-paper"
                      : "text-ink-label"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
      {failed ? (
        <p className="mt-3 flex items-center gap-2 text-caption">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-signal" />
          The run stopped. The feed carries the tool that failed.
        </p>
      ) : null}
    </div>
  );
}
