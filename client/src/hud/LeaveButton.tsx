import { useEffect, useState, type ReactNode } from "react";

/** How long a first press waits for the second that confirms it. */
const CONFIRM_MS = 4000;

interface LeaveProps {
  readonly className: string;
  readonly onLeave: () => void;
  readonly children: ReactNode;
}

/** Leaving the game takes two presses, so a stray click never throws a game away. */
export function LeaveButton({ className, onLeave, children }: LeaveProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const settle = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(settle);
  }, [armed]);
  return (
    <button
      className={`${className}${armed ? " armed" : ""}`}
      onClick={() => (armed ? onLeave() : setArmed(true))}
    >
      {armed ? "Really leave?" : children}
    </button>
  );
}
