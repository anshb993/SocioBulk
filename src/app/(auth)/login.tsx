import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { signIn } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Screen } from "../../components/ui/Screen";
import { TextField } from "../../components/ui/TextField";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (v: Form) => {
    setFormError(null);
    try {
      await signIn(v.email.trim(), v.password);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not log in");
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-ink">Welcome back</Text>
        <Text className="mb-8 mt-2 text-muted">
          Log in to join group campaigns in your society.
        </Text>

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
              autoComplete="password"
              error={errors.password?.message}
            />
          )}
        />

        {formError ? <Text className="mb-3 text-rust">{formError}</Text> : null}
        <Button
          label={isSubmitting ? "Logging in..." : "Log in"}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted">New here? </Text>
          <Link href="/register">
            <Text className="font-semibold text-primary-dark">Create an account</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}