import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SignInScreen } from "../features/auth/screens/SignInScreen";
import { GamesHubScreen } from "../features/games/screens/GamesHubScreen";
import { ShieldGameScreen } from "../features/games/screens/ShieldGameScreen";
import { SnakeGameScreen } from "../features/games/screens/SnakeGameScreen";
import { SocialGameScreen } from "../features/games/screens/SocialGameScreen";
import { LeaderboardScreen } from "../features/leaderboard/screens/LeaderboardScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { QuestsScreen } from "../features/quests/screens/QuestsScreen";
import { ReferralsScreen } from "../features/referrals/screens/ReferralsScreen";
import { RewardsScreen } from "../features/rewards/screens/RewardsScreen";
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
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Quests" component={QuestsScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Referrals" component={ReferralsScreen} />
      <Tab.Screen name="Rating" component={LeaderboardScreen} />
      <Tab.Screen name="Games" component={GamesHubScreen} />
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
          <RootStack.Screen name="SnakeGame" component={SnakeGameScreen} options={{ title: "Halva Snake" }} />
          <RootStack.Screen name="ShieldGame" component={ShieldGameScreen} options={{ title: "Credit Shield Reactor" }} />
          <RootStack.Screen name="SocialGame" component={SocialGameScreen} options={{ title: "Social Ring Signal" }} />
        </RootStack.Navigator>
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={SignInScreen} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
