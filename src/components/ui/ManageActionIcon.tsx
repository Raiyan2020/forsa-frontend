import { cn } from "@/lib/helpers";
import type { ReactNode } from "react";

/**
 * One creator action, as an icon.
 *
 * Shared by the three detail screens — `VolunteerEvent`, `LearnServeDetails`
 * and `EventDetails` — so a creator meets the same row of controls whichever
 * kind of thing they published.
 *
 * Each screen used to carry its own stacked column of labelled buttons beside
 * the title, which pushed the details down a screen. They also carried
 * `xss:hidden` while only the primary action had a mobile counterpart, so close,
 * reopen, resubmit and send-certificates were simply unreachable on a phone. As
 * icons they fit on one line at every width, and that class is gone with them.
 *
 * Icons come from `lucide-react`, the set already used across the app
 * (`OpportunityFeedback.tsx`, the home cards), not from `react-icons`.
 *
 * Every action that changes something opens a confirm/cancel dialog first. That
 * is what makes an unlabelled control safe: the dialog's title spells the
 * action out, so a mis-tap on a phone — where there is no hover tooltip to read
 * — costs a dismissed modal and nothing else. Edit and Repost are the
 * exceptions, and deliberately so: they only navigate to a form, which the back
 * button undoes. `title` + `aria-label` carry the label for pointer and
 * screen-reader users either way.
 *
 * Styling matches `Button variant="secondary"` — the same `#F4F4F7` on
 * `primary-5` these were before — squared off into a circle. `accent` paints
 * the glyph `primary-801` orange, which is how a closed registration reads now
 * that the creator has no «التسجيل مغلق» pill.
 */
export function ManageActionIcon({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
  accent = false,
}: {
  label: string;
  icon: ReactNode;
  /** Omitted for the read-only state markers, which render disabled. */
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F4F7] text-primary-5 transition",
        "hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary-5/40",
        "disabled:cursor-not-allowed 2xl:h-12 2xl:w-12",
        // A disabled state marker keeps full contrast — it is there to be read,
        // not to look unavailable. Only a genuinely blocked action dims.
        disabled && !accent && "opacity-50",
        accent && "text-primary-801",
        danger && "text-red-500"
      )}
    >
      {icon}
    </button>
  );
}

export default ManageActionIcon;
