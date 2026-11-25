import { supabase } from "../lib/supabase";
import type { Profile } from "../store/authStore";

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  role: "resident" | "vendor";
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, role: input.role } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}