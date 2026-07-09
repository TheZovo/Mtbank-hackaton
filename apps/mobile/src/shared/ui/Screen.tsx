import type { PropsWithChildren, ReactNode } from "react";
import type { ScrollViewProps } from "react-native";
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  scrollViewProps?: ScrollViewProps;
}

export function Screen({ children, footer, scrollViewProps, subtitle, title }: ScreenProps) {
  const { contentContainerStyle, ...restScrollViewProps } = scrollViewProps ?? {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={colors.background} barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          {...restScrollViewProps}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.body}>{children}</View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
  },
  header: {
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  body: {
    gap: 14,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
    padding: 16,
  },
});
