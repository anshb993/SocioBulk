import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { fetchProfile } from "../api/auth";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export function useAuthBootstrap() {
  useEffect(() => {
    const { setAuth, setInitialized } = useAuthStore.getState();
    let active = true;

    async function load(session: Session | null) {
      let profile = null;
      if (session) {
        try {
          profile = await fetchProfile(session.user.id);
        } catch {
          profile = null;
        }
      }
      if (!active) return;
      setAuth(session, profile);
      setInitialized(true);
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Deferred on purpose: calling Supabase inside this callback can deadlock.
      setTimeout(() => {
        void load(session);
      }, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
}