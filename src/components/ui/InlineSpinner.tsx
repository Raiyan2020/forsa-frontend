/**
 * A spinner small enough to sit inside a form field. `Loader` is either a
 * full-screen overlay or a padded block, neither of which belongs in an input
 * that is merely checking something in the background.
 */
export default function InlineSpinner({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block w-4 h-4 border-2 border-primary-5 border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
