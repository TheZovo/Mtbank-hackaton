import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { FriendsScreen } from "./FriendsScreen";

const mockGetReferrals = jest.fn();
const mockFindUserByNickname = jest.fn();
const mockAddFriend = jest.fn();
const mockGetFriends = jest.fn();
const mockPlayTogether = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("../../../shared/api/client", () => ({
  getReferrals: (...args: unknown[]) => mockGetReferrals(...args),
  findUserByNickname: (...args: unknown[]) => mockFindUserByNickname(...args),
  addFriend: (...args: unknown[]) => mockAddFriend(...args),
  getFriends: (...args: unknown[]) => mockGetFriends(...args),
  playTogether: (...args: unknown[]) => mockPlayTogether(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { me: { id: string; name: string; nickname?: string | null } }) => unknown) =>
    selector({ me: { id: "usr_1", name: "Orbit Pilot", nickname: "pilot" } }),
}));

describe("FriendsScreen", () => {
  beforeEach(() => {
    mockGetReferrals.mockReset();
    mockFindUserByNickname.mockReset();
    mockAddFriend.mockReset();
    mockGetFriends.mockReset();
    mockPlayTogether.mockReset();
  });

  it("finds users, adds a friend, and opens a gift promo after play together", async () => {
    mockGetReferrals.mockResolvedValue({
      invite_code: "DEMO42",
      referrals: [],
    });
    mockGetFriends
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "usr_2", nickname: "alice", games_played: 0 }])
      .mockResolvedValueOnce([{ id: "usr_2", nickname: "alice", games_played: 3 }]);
    mockFindUserByNickname.mockResolvedValue({ id: "usr_2", nickname: "alice" });
    mockAddFriend.mockResolvedValue({ success: true });
    mockPlayTogether.mockResolvedValue({ gift: true, promocode: "MTB_SOCIAL_ABCD" });

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: Infinity, retry: false },
        queries: { gcTime: Infinity, retry: false },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <FriendsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockGetReferrals).toHaveBeenCalled();
      expect(mockGetFriends).toHaveBeenCalledWith("usr_1");
      expect(screen.getByText("Ваш код приглашения")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Например, alice"), "alice");
    fireEvent.press(screen.getByText("Найти"));

    await waitFor(() => expect(mockFindUserByNickname).toHaveBeenCalledWith("alice"));
    await waitFor(() => expect(screen.getByText("alice")).toBeTruthy());

    fireEvent.press(screen.getByText("Добавить в друзья"));

    await waitFor(() => expect(mockAddFriend).toHaveBeenCalledWith("usr_1", "usr_2"));
    await waitFor(() => expect(screen.getByText("Играть вместе")).toBeTruthy());

    fireEvent.press(screen.getByText("Играть вместе"));

    await waitFor(() => expect(mockPlayTogether).toHaveBeenCalledWith("usr_1", "usr_2"));
    await waitFor(() => expect(screen.getByText("Подарок вселенной")).toBeTruthy());
    expect(screen.getByText("MTB_SOCIAL_ABCD")).toBeTruthy();

    queryClient.clear();
  });
});
