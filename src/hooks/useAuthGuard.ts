import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore, type UserRole } from "../store/authStore";

export const roleHome = {
  resident: "/resident/home",
  vendor: "/vendor/dashboard",
  system_admin: "/system-admin/dashboard",
} as const;

const roleArea: Record<UserRole, string> = {
  resident: "resident",
  vendor: "vendor",
  system_admin: "system-admin",
};

export function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { session, profile, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized || !navState?.key) return;
    const area = segments[0] as string | undefined;
    const inAuth = area === "(auth)";

    if (!session || !profile) {
      if (!inAuth) router.replace("/login");
      return;
    }
    if (inAuth || area !== roleArea[profile.role]) {
      router.replace(roleHome[profile.role]);
    }
  }, [initialized, navState?.key, session, profile, segments, router]);
}