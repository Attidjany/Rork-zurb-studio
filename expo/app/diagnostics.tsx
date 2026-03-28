import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";

type RowProps = {
  label: string;
  value: string;
  testID?: string;
};

function Row({ label, value, testID }: RowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function DiagnosticsScreen() {
  const [copied, setCopied] = useState<boolean>(false);

  const info = useMemo(() => {
    const hostUri =
      (Constants.expoConfig as unknown as { hostUri?: string } | undefined)?.hostUri ??
      (Constants as unknown as { hostUri?: string } | undefined)?.hostUri ??
      "";

    const apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "";

    const normalizedApiBaseUrl = apiBaseUrl
      ? apiBaseUrl.trim().replace(/\/+$/, "")
      : "";

    return {
      platform: Platform.OS,
      appOwnership: String((Constants as unknown as { appOwnership?: string }).appOwnership ?? ""),
      executionEnvironment: String(
        (Constants as unknown as { executionEnvironment?: string }).executionEnvironment ?? ""
      ),
      expoVersion: String(Constants.expoVersion ?? ""),
      runtimeVersion: String((Constants.expoConfig as { runtimeVersion?: string } | undefined)?.runtimeVersion ?? ""),
      hostUri,
      linkingUrl: Linking.createURL("/"),
      apiBaseUrl: normalizedApiBaseUrl,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      hasSupabaseAnonKey: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    };
  }, []);

  const debugText = useMemo(() => JSON.stringify(info, null, 2), [info]);

  return (
    <View style={styles.container} testID="diagnostics/screen">
      <View style={styles.header}>
        <Text style={styles.title} testID="diagnostics/title">
          Diagnostics
        </Text>
        <Text style={styles.subtitle} testID="diagnostics/subtitle">
          If you see “Could not connect to development server”, verify your tunnel/dev
          server is running and you scanned the latest QR.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID="diagnostics/scroll"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Runtime</Text>
          <Row label="platform" value={info.platform} testID="diagnostics/platform" />
          <Row
            label="appOwnership"
            value={info.appOwnership}
            testID="diagnostics/appOwnership"
          />
          <Row
            label="executionEnvironment"
            value={info.executionEnvironment}
            testID="diagnostics/executionEnvironment"
          />
          <Row
            label="expoVersion"
            value={info.expoVersion}
            testID="diagnostics/expoVersion"
          />
          <Row
            label="runtimeVersion"
            value={info.runtimeVersion}
            testID="diagnostics/runtimeVersion"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dev server</Text>
          <Row label="hostUri" value={info.hostUri || "(empty)"} testID="diagnostics/hostUri" />
          <Row
            label="linkingUrl"
            value={info.linkingUrl}
            testID="diagnostics/linkingUrl"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend env</Text>
          <Row
            label="EXPO_PUBLIC_RORK_API_BASE_URL"
            value={info.apiBaseUrl || "(missing)"}
            testID="diagnostics/apiBaseUrl"
          />
          <Row
            label="EXPO_PUBLIC_SUPABASE_URL"
            value={info.supabaseUrl || "(missing)"}
            testID="diagnostics/supabaseUrl"
          />
          <Row
            label="EXPO_PUBLIC_SUPABASE_ANON_KEY"
            value={info.hasSupabaseAnonKey ? "(set)" : "(missing)"}
            testID="diagnostics/supabaseAnonKey"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Copy for support</Text>
          <View style={styles.codeBlock} testID="diagnostics/code">
            <Text style={styles.code} selectable>
              {debugText}
            </Text>
          </View>

          <Pressable
            testID="diagnostics/copy"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={async () => {
              try {
                if (Platform.OS === "web") {
                  await (navigator as unknown as { clipboard?: { writeText?: (t: string) => Promise<void> } })
                    .clipboard?.writeText?.(debugText);
                } else {
                  const Clipboard = await import("expo-clipboard");
                  await Clipboard.setStringAsync(debugText);
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch (e) {
                console.error("[Diagnostics] Failed to copy:", e);
              }
            }}
          >
            <Text style={styles.buttonText}>{copied ? "Copied" : "Copy"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  title: {
    color: "#EAF2FF",
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 6,
    color: "rgba(234, 242, 255, 0.72)",
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitle: {
    color: "rgba(234, 242, 255, 0.9)",
    fontSize: 13,
    fontWeight: "700" as const,
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 1.0,
  },
  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  label: {
    color: "rgba(234, 242, 255, 0.6)",
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: "#EAF2FF",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  codeBlock: {
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  code: {
    color: "rgba(234, 242, 255, 0.85)",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      web: "monospace",
      default: "monospace",
    }),
  },
  button: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(106, 195, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(106, 195, 255, 0.3)",
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "rgba(106, 195, 255, 0.14)",
  },
  buttonText: {
    color: "#BFE8FF",
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },
});
