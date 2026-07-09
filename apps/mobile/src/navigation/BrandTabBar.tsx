import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../shared/theme/colors";

type IconName = "planets" | "leaderboard" | "profile" | "friends" | "ai" | "qr";

const routeIconMap: Record<string, IconName> = {
  PlanetsMap: "planets",
  Leaderboard: "leaderboard",
  Friends: "friends",
  AI: "ai",
  QR: "qr",
  Profile: "profile",
};

function TabIcon({ focused, name }: { name: IconName; focused: boolean }) {
  const stroke = focused ? colors.primary : colors.textMuted;
  const fill = focused ? colors.primarySoft : "transparent";

  if (name === "planets") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Circle cx="12" cy="12" fill={fill} r="3.2" stroke={stroke} strokeWidth="1.8" />
        <Path d="M3 12c2.5-3 15.5-3 18 0s-15.5 3-18 0Z" fill="none" stroke={stroke} strokeWidth="1.8" />
        <Path d="M5.5 7.5c3.5 1.8 9.5 7.2 13 9" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="1.5" />
      </Svg>
    );
  }

  if (name === "leaderboard") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Rect fill={fill} height="6" rx="1.5" stroke={stroke} strokeWidth="1.8" width="4" x="4" y="14" />
        <Rect fill={fill} height="10" rx="1.5" stroke={stroke} strokeWidth="1.8" width="4" x="10" y="10" />
        <Rect fill={fill} height="14" rx="1.5" stroke={stroke} strokeWidth="1.8" width="4" x="16" y="6" />
      </Svg>
    );
  }

  if (name === "friends") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Circle cx="8.5" cy="9" fill={fill} r="2.6" stroke={stroke} strokeWidth="1.8" />
        <Circle cx="15.7" cy="11" fill={fill} r="2.2" stroke={stroke} strokeWidth="1.8" />
        <Path d="M4.5 18c1.2-2.4 2.9-3.5 5-3.5 2.3 0 4 1.1 5 3.5" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="1.8" />
        <Path d="M13 18c.8-1.8 2-2.6 3.7-2.6 1.1 0 2.1.4 3 1.2" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="1.6" />
      </Svg>
    );
  }

  if (name === "ai") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Path d="M12 3.5 13.9 8l4.8.4-3.7 3 1.2 4.6-4.2-2.5-4.2 2.5 1.2-4.6-3.7-3 4.8-.4Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="1.5" />
        <Path d="M12 8.5v3M10.3 10.2h3.4" stroke={stroke} strokeLinecap="round" strokeWidth="1.5" />
      </Svg>
    );
  }

  if (name === "qr") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Rect fill={fill} height="6" rx="1" stroke={stroke} strokeWidth="1.8" width="6" x="3.5" y="3.5" />
        <Rect fill={fill} height="6" rx="1" stroke={stroke} strokeWidth="1.8" width="6" x="14.5" y="3.5" />
        <Rect fill={fill} height="6" rx="1" stroke={stroke} strokeWidth="1.8" width="6" x="3.5" y="14.5" />
        <Path d="M14.5 14.5h2.5v2.5h-2.5zM18.5 14.5h2v6h-6v-2M14.5 18.5h2" fill="none" stroke={stroke} strokeWidth="1.8" />
      </Svg>
    );
  }

  if (name === "profile") {
    return (
      <Svg height={22} viewBox="0 0 24 24" width={22}>
        <Circle cx="12" cy="8.5" fill={fill} r="3.3" stroke={stroke} strokeWidth="1.8" />
        <Path d="M5 19c1.8-3.4 4.2-5 7-5s5.2 1.6 7 5" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="1.8" />
      </Svg>
    );
  }

  return null;
}

export function BrandTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof descriptor.options.tabBarLabel === "string"
              ? descriptor.options.tabBarLabel
              : descriptor.options.title ?? route.name;
          const iconName = routeIconMap[route.name];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [
                styles.item,
                focused ? styles.itemFocused : null,
                pressed ? styles.itemPressed : null,
              ]}
            >
              <TabIcon focused={focused} name={iconName} />
              <Text style={[styles.label, focused ? styles.labelFocused : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inner: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  item: {
    alignItems: "center",
    borderRadius: 20,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  itemFocused: {
    backgroundColor: colors.primarySoft,
  },
  itemPressed: {
    opacity: 0.84,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  labelFocused: {
    color: colors.primary,
    fontWeight: "800",
  },
});
