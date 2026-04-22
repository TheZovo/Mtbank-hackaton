import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SignInScreen } from "../features/auth/screens/SignInScreen";
import { GamesHubScreen } from "../features/games/screens/GamesHubScreen";
import { GameScreen } from "../features/games/screens/GameScreen";
import { ShieldGameScreen } from "../features/games/screens/ShieldGameScreen";
import { SnakeGameScreen } from "../features/games/screens/SnakeGameScreen";
import { SocialGameScreen } from "../features/games/screens/SocialGameScreen";
import { LeaderboardScreen } from "../features/leaderboard/screens/LeaderboardScreen";
import { PlanetDetailScreen } from "../features/planets/screens/PlanetDetailScreen";
import { PlanetsMapScreen } from "../features/planets/screens/PlanetsMapScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { ReferralsScreen } from "../features/referrals/screens/ReferralsScreen";
import { BrandTabBar } from "./BrandTabBar";
import { useSessionBootstrap } from "../shared/hooks/useSessionBootstrap";
import { useSessionStore } from "../shared/state/session-store";
import { colors } from "../shared/theme/colors";
import { LoadingView } from "../shared/ui/LoadingView";

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BrandTabBar {...props} />}
    >
      <Tab.Screen name="PlanetsMap" component={PlanetsMapScreen} options={{ title: "Планеты" }} />
      <Tab.Screen name="GamesHub" component={GamesHubScreen} options={{ title: "Игры" }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "Рейтинг" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Профиль" }} />
      <Tab.Screen name="Referrals" component={ReferralsScreen} options={{ title: "Рефералы" }} />
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
  useSessionBootstrap();
  const status = useSessionStore((state) => state.status);

  if (status === "hydrating") {
    return <LoadingView label="Восстанавливаем сессию..." />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === "authenticated" ? (
        <RootStack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: "700" },
          }}
        >
          <RootStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
          <RootStack.Screen name="PlanetDetail" component={PlanetDetailScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Game" component={GameScreen} options={{ headerShown: false }} />
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
