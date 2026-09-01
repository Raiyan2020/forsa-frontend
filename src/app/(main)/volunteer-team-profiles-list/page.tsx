import { redirect } from "next/navigation";

/**
 * Retired: the three standalone profile-list pages merged into `/more-profile`'s
 * tab switcher. This keeps old bookmarks/links working — forwards the search
 * params `MoreProfile.tsx`'s old "show all" links used to send here.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = new URLSearchParams();
  params.set("tab", "volunteer_team");
  const sp = await searchParams;
  for (const key of ["search", "name", "nickname"]) {
    const value = sp[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  redirect(`/more-profile?${params.toString()}`);
}
