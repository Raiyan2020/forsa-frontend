/**
 * Route builders for the opportunity forms.
 *
 * Editing a learn & serve opportunity has its own addressable URL —
 * `/learn-and-share-form/edit/{id}` — so a creator can reload or share the edit
 * screen. Creating still lands on the bare `/learn-and-share-form`, and
 * **reposting keeps using it too**: a repost seeds a brand-new opportunity from
 * an old one, so it is a create flow wearing a different label, and an
 * `/edit/{id}` URL would misdescribe it.
 */

export const LEARN_SERVE_FORM_PATH = "/learn-and-share-form";

export function learnServeEditPath(id: string | number): string {
  return `${LEARN_SERVE_FORM_PATH}/edit/${id}`;
}
