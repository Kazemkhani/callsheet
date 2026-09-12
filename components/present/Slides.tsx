import {
  close,
  fair,
  idea,
  live,
  loop,
  otherSide,
  person,
  problem,
  title,
  underTheHood,
  whereItLives,
} from "@/lib/present/deck";

/**
 * One slide, one idea. Every slide fills the frame the deck shell gives it and
 * centres itself vertically, so a short slide does not sit at the top of a
 * projector like a document.
 */
function Stage({
  children,
  centred = false,
}: {
  children: React.ReactNode;
  centred?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col justify-center ${
        centred ? "items-center text-center" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function TitleSlide() {
  return (
    <Stage centred>
      <p className="deck-caps text-ink-label">{title.eyebrow}</p>
      <h1 className="deck-wordmark mt-[clamp(1.5rem,3vh,2.5rem)] font-display font-bold text-paper">
        {title.wordmark}
      </h1>
      <p className="deck-lead mt-[clamp(1.5rem,3.5vh,2.75rem)] max-w-[26ch] text-balance text-paper min-[900px]:max-w-[44ch]">
        {title.line}
      </p>
      <p className="deck-meta mt-[clamp(3rem,9vh,7rem)] max-w-[60ch] font-mono text-ink-label">
        {title.team}
      </p>
    </Stage>
  );
}

export function PersonSlide() {
  return (
    <Stage>
      <div className="grid gap-[clamp(2rem,5vh,3.5rem)] min-[900px]:grid-cols-[1.05fr_1fr] min-[900px]:items-start min-[900px]:gap-16">
        <h2 className="deck-headline font-display font-bold text-paper">
          {person.headline}
        </h2>
        <ul className="border-t border-ink-rule">
          {person.lines.map((line) => (
            <li
              key={line}
              className="deck-body border-b border-ink-rule py-[clamp(1rem,2.6vh,1.75rem)] text-paper"
            >
              {line}
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

export function ProblemSlide() {
  return (
    <Stage>
      <h2 className="deck-headline max-w-[20ch] font-display font-bold text-paper">
        {problem.headline}
      </h2>
      <ol className="mt-[clamp(2rem,5vh,3.5rem)] border-t border-ink-rule">
        {problem.steps.map((row, i) => (
          <li
            key={row.step}
            className="flex flex-wrap items-baseline gap-x-[clamp(1.25rem,3vw,2.5rem)] gap-y-2 border-b border-ink-rule py-[clamp(0.875rem,2.4vh,1.5rem)]"
          >
            <span
              aria-hidden="true"
              className="deck-numeral w-[2ch] shrink-0 font-display font-bold text-ink-label"
            >
              {i + 1}
            </span>
            <span className="deck-lead flex-1 text-paper">{row.step}</span>
            <span className="deck-lead shrink-0 font-mono font-medium tabular-nums text-signal">
              {row.cost}
            </span>
          </li>
        ))}
      </ol>
      <p className="deck-body mt-[clamp(1.5rem,3.5vh,2.5rem)] text-ink-label">
        {problem.footnote}
      </p>
    </Stage>
  );
}

export function OtherSideSlide() {
  return (
    <Stage>
      <h2 className="deck-headline max-w-[26ch] font-display font-bold text-paper">
        {otherSide.headline}
      </h2>
      <dl className="mt-[clamp(2rem,5vh,3.5rem)] border-t border-ink-rule">
        {otherSide.rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-1 border-b border-ink-rule py-[clamp(1rem,2.8vh,1.75rem)]"
          >
            <dt className="deck-caps w-full shrink-0 text-signal min-[900px]:w-[14ch]">
              {row.label}
            </dt>
            <dd className="deck-lead flex-1 text-paper">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="deck-body mt-[clamp(1.5rem,3.5vh,2.5rem)] text-ink-label">
        {otherSide.footnote}
      </p>
    </Stage>
  );
}

export function IdeaSlide() {
  return (
    <Stage centred>
      <h2 className="deck-statement font-display font-bold text-paper">
        {idea.lines.map((line, i) => (
          <span
            key={line}
            className={`block ${i === 2 ? "text-signal" : ""} ${
              i > 0 ? "mt-[clamp(0.5rem,1.4vh,1rem)]" : ""
            }`}
          >
            {line}
          </span>
        ))}
      </h2>
    </Stage>
  );
}

export function WhereItLivesSlide() {
  return (
    <Stage>
      <div className="grid gap-[clamp(2rem,4vh,3rem)] min-[900px]:grid-cols-2 min-[900px]:gap-0">
        <section className="min-[900px]:pr-[clamp(2rem,4vw,4.5rem)]">
          <p className="deck-caps text-ink-label">
            {whereItLives.channel.label}
          </p>
          <p className="deck-panel mt-[clamp(1.25rem,3vh,2rem)] text-paper">
            {whereItLives.channel.body}
          </p>
        </section>
        <section className="border-t border-ink-rule pt-[clamp(2rem,4vh,3rem)] min-[900px]:border-t-0 min-[900px]:border-l min-[900px]:pt-0 min-[900px]:pl-[clamp(2rem,4vw,4.5rem)]">
          <p className="deck-caps text-ink-label">{whereItLives.office.label}</p>
          <p className="deck-panel mt-[clamp(1.25rem,3vh,2rem)] text-paper">
            {whereItLives.office.body}
          </p>
          <p className="deck-meta mailbox mt-[clamp(1.5rem,3.5vh,2.5rem)] font-medium text-signal">
            {whereItLives.office.mailbox}
          </p>
        </section>
      </div>
      <p className="deck-body mt-[clamp(2.5rem,7vh,5rem)] border-t border-ink-rule pt-[clamp(1.25rem,3vh,2rem)] text-paper">
        {whereItLives.footnote}
      </p>
    </Stage>
  );
}

export function LoopSlide() {
  return (
    <Stage>
      <h2 className="deck-subhead max-w-[24ch] font-display font-bold text-paper">
        {loop.headline}
      </h2>

      <div className="mt-[clamp(3rem,9vh,6rem)] flex flex-col gap-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-0">
        {loop.steps.map((step, i) => {
          const gate = i === loop.gateIndex;
          return (
            <div
              key={step}
              className="relative flex items-center gap-[0.75vw] min-[900px]:flex-1"
            >
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className="hidden h-px flex-1 bg-ink-rule min-[900px]:block"
                />
              ) : null}
              <span
                className={`deck-caps shrink-0 whitespace-nowrap ${
                  gate ? "font-medium text-signal" : "text-paper"
                }`}
              >
                {gate ? `[ ${step} ]` : step}
              </span>
              {i === loop.steps.length - 1 ? null : (
                <span
                  aria-hidden="true"
                  className="hidden h-px flex-1 bg-ink-rule min-[900px]:block"
                />
              )}
              {gate ? (
                <p className="deck-step text-ink-label min-[900px]:absolute min-[900px]:left-1/2 min-[900px]:top-full min-[900px]:w-[clamp(18rem,30vw,38rem)]">
                  <span
                    aria-hidden="true"
                    className="mb-[clamp(0.75rem,1.6vh,1.25rem)] hidden h-[clamp(1rem,2.4vh,1.75rem)] w-px bg-signal min-[900px]:block"
                  />
                  {loop.gateNote}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

    </Stage>
  );
}

export function FairSlide() {
  return (
    <Stage>
      <h2 className="deck-headline max-w-[22ch] font-display font-bold text-paper">
        {fair.headline}
      </h2>
      <div className="mt-[clamp(2rem,5vh,3.5rem)] max-w-[70ch]">
        {fair.lines.map((line) => (
          <p key={line} className="deck-lead mt-[clamp(0.75rem,1.8vh,1.25rem)] text-paper">
            {line}
          </p>
        ))}
      </div>
      <div className="mt-[clamp(2.5rem,7vh,4.5rem)] flex flex-wrap items-center gap-[clamp(0.75rem,1.2vw,1.25rem)]">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`block size-[clamp(2rem,3.4vw,3.25rem)] ${
              i === 9
                ? "bg-ink-olive"
                : "border border-paper"
            }`}
          />
        ))}
        <span className="deck-meta ml-[clamp(1rem,2vw,2rem)] font-mono text-ink-olive">
          {fair.caption}
        </span>
      </div>
    </Stage>
  );
}

export function LiveSlide({ status }: { status: React.ReactNode }) {
  return (
    <Stage centred>
      <h2 className="deck-hero font-display font-bold text-paper">
        {live.headline}
      </h2>
      <p className="deck-lead mt-[clamp(1.5rem,4vh,2.75rem)] text-ink-label">
        {live.line}
      </p>
      <p className="deck-meta mt-[clamp(4rem,14vh,10rem)] font-mono text-ink-label">
        {live.where}
      </p>
      {status}
    </Stage>
  );
}

export function UnderTheHoodSlide() {
  return (
    <Stage>
      <h2 className="deck-subhead font-display font-bold text-paper">
        {underTheHood.headline}
      </h2>
      <dl className="mt-[clamp(1.5rem,4vh,2.75rem)] border-t border-ink-rule">
        {underTheHood.rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline gap-x-[clamp(1.5rem,3.5vw,3.5rem)] gap-y-1 border-b border-ink-rule py-[clamp(0.625rem,1.6vh,1.125rem)]"
          >
            <dt className="deck-caps w-full shrink-0 text-ink-label min-[900px]:w-[12ch]">
              {row.label}
            </dt>
            <dd className="deck-step flex-1 text-paper">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Stage>
  );
}

export function CloseSlide() {
  return (
    <Stage centred>
      <h2 className="deck-statement max-w-[18ch] font-display font-bold text-balance text-paper">
        {close.headline}
      </h2>
      <p className="deck-lead mt-[clamp(1.5rem,4vh,2.75rem)] text-ink-label">
        {close.line}
      </p>
      <span
        aria-hidden="true"
        className="mt-[clamp(2.5rem,7vh,4.5rem)] block h-px w-[clamp(8rem,20vw,18rem)] bg-ink-rule"
      />
      <p className="deck-meta mt-[clamp(1.5rem,4vh,2.5rem)] font-mono text-paper">
        {close.repo}
      </p>
    </Stage>
  );
}
