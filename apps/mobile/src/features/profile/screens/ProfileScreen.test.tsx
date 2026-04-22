import Clipboard from "@react-native-clipboard/clipboard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileScreen } from "./ProfileScreen";

const mockGetMe = jest.fn();
const mockGetPromocodes = jest.fn();
const mockLogout = jest.fn();
const mockClearSession = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("@react-native-clipboard/clipboard", () => ({
  setString: jest.fn(),
}));

jest.mock("../../../shared/api/client", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  getPromocodes: (...args: unknown[]) => mockGetPromocodes(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { clear: typeof mockClearSession }) => unknown) =>
    selector({ clear: mockClearSession }),
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    mockGetPromocodes.mockReset();
    mockLogout.mockReset();
    mockClearSession.mockReset();
    (Clipboard.setString as jest.Mock).mockReset();
  });

  it("renders profile stats and copies promo code", async () => {
    mockGetMe.mockResolvedValue({
      id: "user-1",
      phone: "+375290001122",
      name: "Pilot Roman",
      daily_game_attempts_used: 2,
      daily_game_attempts_limit: 5,
      total_constellations_sum: 4,
      average_cashback: 3.5,
    });
    mockGetPromocodes.mockResolvedValue({
      promocodes: [
        {
          code: "MTB_APTEKI_20260422_ABCD",
          planet_id: "apteki",
          issued_at: "2026-04-22T10:00:00Z",
          used_at: null,
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <ProfileScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalled();
      expect(mockGetPromocodes).toHaveBeenCalled();
      expect(screen.getByText("Pilot Roman")).toBeTruthy();
      expect(screen.getByText("+375290001122")).toBeTruthy();
      expect(screen.getByText("MTB_APTEKI_20260422_ABCD")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Скопировать"));

    expect(Clipboard.setString).toHaveBeenCalledWith("MTB_APTEKI_20260422_ABCD");
    queryClient.clear();
  });
});
