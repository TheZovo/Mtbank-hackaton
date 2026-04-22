import { AppProviders } from "./providers/AppProviders";
import { RootNavigator } from "../navigation/RootNavigator";
import { useSessionBootstrap } from "../shared/hooks/useSessionBootstrap";

function AppInner() {
  useSessionBootstrap();
  return <RootNavigator />;
}

export default function App() {
  return (
    <AppProviders>
      <AppInner />
    </AppProviders>
  );
}
