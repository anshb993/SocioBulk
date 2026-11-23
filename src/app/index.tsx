import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { supabase } from "../../src/lib/supabase";

export default function Index() {
  const [status, setStatus] = useState("Checking Supabase...");

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) =>
      setStatus(error ? `Error: ${error.message}` : "Supabase connected")
    );
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-ink">SocioBulk</Text>
      <Text className="mt-2 text-muted">{status}</Text>
      <Pressable className="mt-6 rounded-2xl bg-primary px-8 py-4">
        <Text className="font-semibold text-white">Join group</Text>
      </Pressable>
    </View>
  );
}