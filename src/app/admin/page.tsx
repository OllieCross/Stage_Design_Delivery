import { redirect } from "next/navigation";

// The project list and management UI that used to live here moved to the
// main page (/), gated by the same passkey session - this just catches
// anyone still bookmarked at the old URL.
export default function AdminHome() {
  redirect("/");
}
