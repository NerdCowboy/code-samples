import { syncGlucoseData, RequestType, SyncResult } from "./rate-limit";

const mockDate = new Date("January 1, 2021 00:00:00");
const oneMin = 60;

async function testSyncHelper(
  userId: string,
  syncType: RequestType,
  delaySeconds: number
): Promise<SyncResult> {
  // Reset system time between each assertion so we can control the request time in setTimeout
  jest.setSystemTime(mockDate);

  const delayMs = delaySeconds * 1000;
  const request: Promise<SyncResult> = new Promise((resolve) =>
    setTimeout(() => {
      const startTime = new Date();

      syncGlucoseData(userId, syncType).then((result) => {
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationSeconds = durationMs / 1000;
        console.log(
          `→ ${syncType} for ${userId}: ${result} after ${durationSeconds}s`
        );
        resolve(result);
      });
    }, delayMs)
  );

  // Jump to end of all timers
  jest.runAllTimers();
  const result = await request;

  // Keep retrying if sync failed
  if (result === SyncResult.SyncFailed) {
    return testSyncHelper(userId, syncType, delaySeconds);
  } else {
    return Promise.resolve(result);
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(mockDate);
});

describe("Rate Limiting", () => {
  it("should only allow 1 automated sync within 8 hrs of any kind of sync", async () => {
    const firstResult = await testSyncHelper("a", RequestType.Automated, 0);
    const secondResult = await testSyncHelper("a", RequestType.Automated, 8);
    const afterEightHrsResult = await testSyncHelper(
      "a",
      RequestType.Automated,
      oneMin * 480
    ); // 8hrs

    expect(firstResult).toBe(SyncResult.SyncSuccessful);
    expect(secondResult).toBe(SyncResult.RateLimited);
    // Request limit should be reset after 8 hrs
    expect(afterEightHrsResult).toBe(SyncResult.SyncSuccessful);
  });

  it("should only allow 2 user app open syncs within 3 minutes & 5 within 30 minutes", async () => {
    const userAppOpen = (time: number) =>
      testSyncHelper("a", RequestType.UserAppOpen, time);
    const firstResult = await userAppOpen(0);
    const secondResult = await userAppOpen(oneMin);
    const thirdResult = await userAppOpen(oneMin * 2);
    const fourthResult = await userAppOpen(oneMin * 4);
    const fifthResult = await userAppOpen(oneMin * 27);
    const sixthResult = await userAppOpen(oneMin * 28);
    const seventhResult = await userAppOpen(oneMin * 29);
    const after30MinResult = await userAppOpen(oneMin * 30);

    expect(firstResult).toBe(SyncResult.SyncSuccessful);
    expect(secondResult).toBe(SyncResult.SyncSuccessful);
    expect(thirdResult).toBe(SyncResult.RateLimited);
    expect(fourthResult).toBe(SyncResult.SyncSuccessful);
    expect(fifthResult).toBe(SyncResult.SyncSuccessful);
    expect(sixthResult).toBe(SyncResult.SyncSuccessful);
    expect(seventhResult).toBe(SyncResult.RateLimited);
    // Request limit should be reset after 30 min
    expect(after30MinResult).toBe(SyncResult.SyncSuccessful);
  });

  it("should only allow 1 user request syncs within 3 minutes & 3 within 30 minutes", async () => {
    const userRequest = (time: number) =>
      testSyncHelper("a", RequestType.UserRequest, time);
    const firstResult = await userRequest(0);
    const secondResult = await userRequest(oneMin);
    const thirdResult = await userRequest(oneMin * 4);
    const fourthResult = await userRequest(oneMin * 28);
    const fifthResult = await userRequest(oneMin * 29);
    const after30MinResult = await userRequest(oneMin * 30);

    expect(firstResult).toBe(SyncResult.SyncSuccessful);
    expect(secondResult).toBe(SyncResult.RateLimited);
    expect(thirdResult).toBe(SyncResult.SyncSuccessful);
    expect(fourthResult).toBe(SyncResult.SyncSuccessful);
    expect(fifthResult).toBe(SyncResult.RateLimited);
    // Request limit should be reset after 30 min
    expect(after30MinResult).toBe(SyncResult.SyncSuccessful);
  });
});

export {};
