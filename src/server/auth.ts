"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";
import { checkCredentials, createSession, destroySession } from "@/lib/session";

const LOGIN_ATTEMPTS_PER_MINUTE = 5;

export async function login(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`login:${ip}`, LOGIN_ATTEMPTS_PER_MINUTE)) {
    redirect("/login?error=rate");
  }

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!checkCredentials(username, password)) {
    redirect("/login?error=invalid");
  }

  await createSession();
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
