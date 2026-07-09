import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import { ReferralsScreen } from "./ReferralsScreen";

const mockGetReferrals = jest.fn();
const mockCreateReferral = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("../../../shared/api/client", () => ({
  getReferrals: (...args: unknown[]) => mockGetReferrals(...args),
  createReferral: (...args: unknown[]) => mockCreateReferral(...args),
}));

describe("ReferralsScreen", () => {
  beforeEach(() => {
    mockGetReferrals.mockReset();
    mockCreateReferral.mockReset();
  });

  it("shares invite link and creates referral", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);

    mockGetReferrals.mockResolvedValue({
      invite_code: "ABC123",
      referrals: [
        {
          phone: "+375291112233",
          status: "joined",
          stars_earned: 1,
        },
      ],
    });
    mockCreateReferral.mockResolvedValue({
      status: "ok",
      invite_code: "ABC123",
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: Infinity, retry: false },
        queries: { gcTime: Infinity, retry: false },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <ReferralsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mockGetReferrals).toHaveBeenCalled());
    expect(await screen.findByText("ABC123")).toBeTruthy();

    fireEvent.press(screen.getByText("Поделиться"));
    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({
        message: "app://invite?code=ABC123",
        url: "app://invite?code=ABC123",
      }),
    );

    fireEvent.changeText(screen.getByPlaceholderText("+375 29 000 00 00"), "+375299998877");
    fireEvent.press(screen.getByText("Пригласить"));

    await waitFor(() => expect(mockCreateReferral).toHaveBeenCalledWith({ phone: "+375299998877" }));

    shareSpy.mockRestore();
    queryClient.clear();
  });
});
