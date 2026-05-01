"use client";

import { useEffect, useState } from "react";

const PLACEHOLDERS = [
  "Remote Frontend Jobs In Europe",
  "ML Engineer With Python",
  "Senior Design Roles",
  "Anything Fun In Bangalore",
  "Marketing Roles In Berlin",
  "Data Analyst, Hybrid, NYC",
];

const TYPE_MS = 65;
const DELETE_MS = 30;
const HOLD_AT_FULL_MS = 1600;
const PAUSE_AT_EMPTY_MS = 350;

type Phase = "typing" | "holding" | "deleting" | "pausing";

export function RotatingSearchInput({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [hasContent, setHasContent] = useState(Boolean(defaultValue));
  const [focused, setFocused] = useState(false);

  // Hide the typewriter overlay as soon as the input is focused — that's
  // when a real user starts looking at it as a regular text field.
  const overlayVisible = !focused && !hasContent;

  useEffect(() => {
    if (!overlayVisible) return; // freeze animation while hidden

    const target = PLACEHOLDERS[phraseIndex];

    switch (phase) {
      case "typing":
        if (text.length < target.length) {
          const id = setTimeout(
            () => setText(target.slice(0, text.length + 1)),
            TYPE_MS,
          );
          return () => clearTimeout(id);
        }
        setPhase("holding");
        return;

      case "holding": {
        const id = setTimeout(() => setPhase("deleting"), HOLD_AT_FULL_MS);
        return () => clearTimeout(id);
      }

      case "deleting":
        if (text.length > 0) {
          const id = setTimeout(
            () => setText(target.slice(0, text.length - 1)),
            DELETE_MS,
          );
          return () => clearTimeout(id);
        }
        setPhase("pausing");
        return;

      case "pausing": {
        const id = setTimeout(() => {
          setPhraseIndex((i) => (i + 1) % PLACEHOLDERS.length);
          setPhase("typing");
        }, PAUSE_AT_EMPTY_MS);
        return () => clearTimeout(id);
      }
    }
  }, [text, phase, phraseIndex, overlayVisible]);

  const cursorClass =
    phase === "holding" || phase === "pausing"
      ? "jh-cursor-blink"
      : "opacity-70";

  return (
    <div className="relative flex-1">
      <input
        name="q"
        defaultValue={defaultValue}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => setHasContent(e.target.value.length > 0)}
        className="relative w-full px-4 py-3 rounded-lg border border-black/15 dark:border-white/15 bg-transparent text-base placeholder:text-transparent"
        placeholder=" "
      />
      {overlayVisible && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 right-0 px-4 py-3 flex items-center text-base text-foreground/55 overflow-hidden"
        >
          <span className="truncate">{text}</span>
          <span
            className={`ml-[1px] inline-block w-[1.5px] h-5 bg-foreground/60 ${cursorClass}`}
          />
        </span>
      )}
    </div>
  );
}
