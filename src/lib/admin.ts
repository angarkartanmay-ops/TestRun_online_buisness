import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "./session";

/** Every admin page and action calls this. Non-admins get a 404, not a hint that /admin exists. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (!isAdmin(user.email)) notFound();
  return user;
}
