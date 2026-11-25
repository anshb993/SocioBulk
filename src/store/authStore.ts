import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export type UserRole = "resident" | "vendor" | "system_admin";
export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  initialized: boolean;
  setAuth: (session: Session | null, profile: Profile | null) => void;
  setInitialized: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  initialized: false,
  setAuth: (session, profile) => set({ session, profile }),
  setInitialized: (initialized) => set({ initialized }),
}));