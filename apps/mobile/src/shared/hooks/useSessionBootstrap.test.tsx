import { render, waitFor } from "@testing-library/react-native";
import { useSessionBootstrap } from "./useSessionBootstrap";

const mockGetMe = jest.fn();
const mockLogout = jest.fn();
const mockHydrate = jest.fn();
const mockClear = jest.fn();
const mockUpdateMe = jest.fn();

let mockStoreState = {
  hydrate: mockHydrate,
  clear: mockClear,
  updateMe: mockUpdateMe,
  status: "anonymous" as "hydrating" | "anonymous" | "authenticated",
  accessToken: null as string | null,
};

jest.mock("../api/client", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

jest.mock("../state/session-store", () => ({
  useSessionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

function BootstrapProbe() {
  useSessionBootstrap();
  return null;
}

describe("useSessionBootstrap", () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    mockLogout.mockReset();
    mockHydrate.mockReset();
    mockClear.mockReset();
    mockUpdateMe.mockReset();
    mockStoreState = {
      hydrate: mockHydrate,
      clear: mockClear,
      updateMe: mockUpdateMe,
      status: "anonymous",
      accessToken: null,
    };
  });

  it("hydrates session state on mount", async () => {
    render(<BootstrapProbe />);

    await waitFor(() => expect(mockHydrate).toHaveBeenCalled());
  });

  it("refreshes current user when session is authenticated", async () => {
    mockStoreState = {
      ...mockStoreState,
      accessToken: "access-token",
      status: "authenticated",
    };
    mockGetMe.mockResolvedValue({
      id: "user-1",
      phone: "+375290001122",
      name: "Pilot Roman",
      daily_game_attempts_used: 0,
      daily_game_attempts_limit: 5,
      total_constellations_sum: 0,
      average_cashback: 0,
    });

    render(<BootstrapProbe />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockUpdateMe).toHaveBeenCalledWith({
        id: "user-1",
        phone: "+375290001122",
        name: "Pilot Roman",
        daily_game_attempts_used: 0,
        daily_game_attempts_limit: 5,
        total_constellations_sum: 0,
        average_cashback: 0,
      }),
    );
  });

  it("logs out and clears session when current user fetch fails", async () => {
    mockStoreState = {
      ...mockStoreState,
      accessToken: "access-token",
      status: "authenticated",
    };
    mockGetMe.mockRejectedValue(new Error("Unauthorized"));
    mockLogout.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);

    render(<BootstrapProbe />);

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(mockClear).toHaveBeenCalled());
  });
});
