import Clipboard from "@react-native-clipboard/clipboard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileScreen } from "./ProfileScreen";

const mockGetMe = jest.fn();
const mockGetPromocodes = jest.fn();
const mockSaveNickname = jest.fn();
const mockLogout = jest.fn();
const mockClearSession = jest.fn();
const mockUpdateMe = jest.fn();

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
  saveNickname: (...args: unknown[]) => mockSaveNickname(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { clear: typeof mockClearSession; updateMe: typeof mockUpdateMe }) => unknown) =>
    selector({ clear: mockClearSession, updateMe: mockUpdateMe }),
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    mockGetPromocodes.mockReset();
    mockSaveNickname.mockReset();
    mockLogout.mockReset();
    mockClearSession.mockReset();
    mockUpdateMe.mockReset();
    (Clipboard.setString as jest.Mock).mockReset();
  });

  it("renders profile stats, saves nickname, and copies promo code", async () => {
    mockGetMe.mockResolvedValue({
      id: "user-1",
      phone: "+375290001122",
      name: "Pilot Roman",
      nickname: "roman",
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
    mockSaveNickname.mockResolvedValue({
      id: "user-1",
      nickname: "captain",
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: Infinity, retry: false },
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
      expect(screen.getByDisplayValue("roman")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Ваш nickname"), "captain");
    fireEvent.press(screen.getByText("Сохранить nickname"));

    await waitFor(() => expect(mockSaveNickname).toHaveBeenCalledWith("captain", "user-1"));
    expect(mockUpdateMe).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        nickname: "captain",
      }),
    );

    fireEvent.press(screen.getByText("Скопировать"));

    expect(Clipboard.setString).toHaveBeenCalledWith("MTB_APTEKI_20260422_ABCD");
    queryClient.clear();
  });
});
