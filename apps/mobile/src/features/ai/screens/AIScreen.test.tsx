import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AIScreen } from "./AIScreen";

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

describe("AIScreen", () => {
  it("builds advice cards after local analysis", async () => {
    const screen = render(<AIScreen />);

    fireEvent.press(screen.getByText("Анализировать"));

    await waitFor(() => expect(screen.getByText("AI-финансовый помощник")).toBeTruthy());
    expect(screen.getByText(/Слишком много тратишь в кафе/i)).toBeTruthy();
  });
});
