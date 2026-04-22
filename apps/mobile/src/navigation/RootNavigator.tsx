import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSessionStore } from "../shared/state/session-store";
import { LoadingView } from "../shared/ui/LoadingView";
import { colors } from "../shared/theme/colors";
import { SignInScreen } from "../features/auth/screens/SignInScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { QuestsScreen } from "../features/quests/screens/QuestsScreen";
import { RewardsScreen } from "../features/rewards/screens/RewardsScreen";
import { ReferralsScreen } from "../features/referrals/screens/ReferralsScreen";
import { LeaderboardScreen } from "../features/leaderboard/screens/LeaderboardScreen";
import { GamesHubScreen } from "../features/games/screens/GamesHubScreen";
import { SnakeGameScreen } from "../features/games/screens/SnakeGameScreen";
import { ShieldGameScreen } from "../features/games/screens/ShieldGameScreen";
import { SocialGameScreen } from "../features/games/screens/SocialGameScreen";

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Профиль" component={ProfileScreen} />
      <Tab.Screen name="Квесты" component={QuestsScreen} />
      <Tab.Screen name="Награды" component={RewardsScreen} />
      <Tab.Screen name="Рефералы" component={ReferralsScreen} />
      <Tab.Screen name="Лидерборд" component={LeaderboardScreen} />
      <Tab.Screen name="Игры" component={GamesHubScreen} />
    </Tab.Navigator>
  );
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  const status = useSessionStore((state) => state.status);

  if (status === "hydrating") {
    return <LoadingView />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === "authenticated" ? (
        <RootStack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        >
          <RootStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
          <RootStack.Screen name="SnakeGame" component={SnakeGameScreen} options={{ title: "Змейка Халва" }} />
          <RootStack.Screen name="ShieldGame" component={ShieldGameScreen} options={{ title: "Реактор щита" }} />
          <RootStack.Screen name="SocialGame" component={SocialGameScreen} options={{ title: "Сигнальный ринг" }} />
        </RootStack.Navigator>
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={SignInScreen} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
