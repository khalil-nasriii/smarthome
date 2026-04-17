import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || password.length < 8) {
      Alert.alert("Invalid input", "Enter a valid email and password (min 8 chars).");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      Alert.alert("Auth failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>
          {mode === "login" ? "Login" : "Register"}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable onPress={submit} disabled={loading} style={[styles.button, { borderColor: colors.neonBlue }]}>
          <Text style={[styles.buttonText, { color: colors.neonBlue }]}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  button: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  switchText: { textAlign: "center", fontSize: 12, marginTop: 8 },
});

