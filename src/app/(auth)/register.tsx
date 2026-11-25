import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { signUp } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Screen } from "../../components/ui/Screen";
import { TextField } from "../../components/ui/TextField";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type Form = z.infer<typeof schema>;

export default function Register() {
  const [role, setRole] = useState<"resident" | "vendor">("resident");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = async (v: Form) => {
    setFormError(null);
    setNotice(null);
    try {
      const data = await signUp({
        email: v.email.trim(),
        password: v.password,
        fullName: v.fullName.trim(),
        role,
      });
      if (!data.session) {
        setNotice("Account created. Check your email to confirm it, then log in.");
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create account");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Text className="text-3xl font-bold text-ink">Create account</Text>
        <Text className="mb-6 mt-2 text-muted">I am joining as</Text>

        <View className="mb-6 flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Resident"
              variant={role === "resident" ? "primary" : "tonal"}
              onPress={() => setRole("resident")}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Service provider"
              variant={role === "vendor" ? "primary" : "tonal"}
              onPress={() => setRole("vendor")}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Full name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoComplete="name"
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              error={errors.password?.message}
            />
          )}
        />

        {formError ? <Text className="mb-3 text-rust">{formError}</Text> : null}
        {notice ? <Text className="mb-3 text-primary-dark">{notice}</Text> : null}
        <Button
          label={isSubmitting ? "Creating account..." : "Create account"}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />

        <View className="mb-6 mt-6 flex-row justify-center">
          <Text className="text-muted">Already have an account? </Text>
          <Link href="/login">
            <Text className="font-semibold text-primary-dark">Log in</Text>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}