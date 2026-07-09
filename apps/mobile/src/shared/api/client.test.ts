import { getPromocodes, submitGameRun } from "./client";

const mockSetSession = jest.fn();
let mockSessionState = {
  accessToken: "expired-access",
  refreshToken: "refresh-token",
  me: null,
  setSession: mockSetSession,
};

jest.mock("../state/session-store", () => ({
  useSessionStore: {
    getState: () => mockSessionState,
  },
}));

function createJsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("api client", () => {
  beforeEach(() => {
    mockSetSession.mockReset();
    mockSessionState = {
      accessToken: "expired-access",
      refreshToken: "refresh-token",
      me: null,
      setSession: mockSetSession,
    };
    mockSetSession.mockImplementation(async (payload) => {
      mockSessionState = {
        ...mockSessionState,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        me: payload.me,
        setSession: mockSetSession,
      };
    });
    globalThis.fetch = jest.fn();
  });

  it("refreshes tokens and retries the original request on 401", async () => {
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch
      .mockResolvedValueOnce(createJsonResponse(401, { detail: "Unauthorized" }))
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          id: "user-1",
          phone: "+375290001122",
          name: "Pilot Roman",
          daily_game_attempts_used: 0,
          daily_game_attempts_limit: 5,
          total_constellations_sum: 0,
          average_cashback: 0,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          promocodes: [
            {
              code: "PROMO-1",
              planet_id: "apteki",
              issued_at: "2026-04-22T10:00:00Z",
              used_at: null,
            },
          ],
        }),
      );

    const result = await getPromocodes();

    expect(result.promocodes).toHaveLength(1);
    expect(mockSetSession).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      me: {
        id: "user-1",
        phone: "+375290001122",
        name: "Pilot Roman",
        daily_game_attempts_used: 0,
        daily_game_attempts_limit: 5,
        total_constellations_sum: 0,
        average_cashback: 0,
      },
    });
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/auth\/refresh$/),
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/me$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer new-access",
        }),
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(/\/promocodes$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer new-access",
        }),
      }),
    );
  });

  it("submits a game run with the default planet mapping", async () => {
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch.mockResolvedValueOnce(
      createJsonResponse(200, {
        small_star_awarded: true,
        remaining_attempts_today: 4,
        planet_progress: {
          planet_id: "apteki",
          cashback_percent: 2.5,
          max_cashback_reached: false,
          constellation: {
            name: "Малая Медведица",
            index: 1,
            big_stars_total: 6,
            current_big_star: 1,
            small_stars_per_segment: 10,
            small_stars_current: 1,
            big_stars: [false, false, false, false, false, false],
            segment_small_stars: [1, 0, 0, 0, 0, 0],
          },
          period_small_stars: 1,
          big_stars_until_increase: 5,
          game: {
            code: "halva_snake",
            name: "Змейка",
            daily_attempts_used: 1,
            daily_attempts_limit: 5,
          },
        },
      }),
    );

    const result = await submitGameRun("halva_snake", { score: 42 });

    expect(result.small_star_awarded).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/games\/halva_snake\/runs$/),
      expect.objectContaining({
        body: JSON.stringify({
          score: 42,
          planet_id: "apteki",
        }),
        method: "POST",
      }),
    );
  });
});
