import { differenceInHours, differenceInMinutes } from "date-fns";

enum RequestType {
  Automated = "Automated",
  UserAppOpen = "UserAppOpen",
  UserRequest = "UserRequest",
}

enum SyncResult {
  SyncSuccessful = "SyncSuccessful",
  SyncFailed = "SyncFailed",
  RateLimited = "RateLimited",
}

interface RequestRecord {
  requestTime: Date | null;
  requestsCount: number;
}

// 1. Could add Automated request type here as well, but since it's limit is 1, we can save a value in the DB
// 2. Probably a bit polarizing as naming uses PascalCase, but gets me a single source of truth more cleanly
interface UserRecord {
  [key: string]: {
    lastRequestTime: Date | null; // 1
    [RequestType.UserAppOpen]: RequestRecord; // 2
    [RequestType.UserRequest]: RequestRecord; // 2
  };
}

// Fake implementation of a sync job.
function doSync(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error("Scrape failed"));
      } else {
        resolve(); // It worked!
      }
    }, Math.random() * 5000);
  });
}

/**
 * Runs data syncs for user sync requests. Rate limits per `RequestType` rules.
 *
 * See README.md for details on the rules.
 *
 * Reminder:
 *  - Rate limits are unique per userId. One user being rate limiting doesn't affect another.
 *  - If there's an ongoing request already of any time for a userId, wait until it's finished
 *    before continuing.
 *  - This function should never throw, and the Promise should always resolve.
 *      - Rate limits return `SyncResult.RateLimited`.
 *      - Successes return `SyncResult.SyncSuccessful`.
 *      - Failures return `SyncResult.SyncFailed`
 *  - If a sync fails, it should not contribute t`o any rate limiting. For all rate limits, only
 *    consider successes.
 */

const fakeDb: UserRecord = {};

async function syncGlucoseData(
  userId: string,
  syncType: RequestType
): Promise<SyncResult> {
  const now = new Date();
  const userRecord = fakeDb[userId];
  const getMinsPassed = (requestTime: Date) => {
    return differenceInMinutes(now, requestTime);
  };

  // Add new user to DB
  if (!userRecord) {
    fakeDb[userId] = {
      lastRequestTime: null,
      [RequestType.UserAppOpen]: {
        requestTime: null,
        requestsCount: 0,
      },
      [RequestType.UserRequest]: {
        requestTime: null,
        requestsCount: 0,
      },
    };
  }

  // Implement rate limiting per request type
  switch (syncType) {
    case RequestType.Automated: {
      if (
        userRecord?.lastRequestTime &&
        differenceInHours(now, userRecord.lastRequestTime) < 8
      ) {
        return Promise.resolve(SyncResult.RateLimited);
      }
      break;
    }

    case RequestType.UserAppOpen: {
      // Skip if record isn't created yet
      if (!userRecord?.UserAppOpen.requestTime) break;

      const { requestTime, requestsCount } = userRecord.UserAppOpen;
      const minsPassed = getMinsPassed(requestTime);

      if (
        (minsPassed < 3 && requestsCount > 1) ||
        (minsPassed < 30 && requestsCount >= 5)
      ) {
        return Promise.resolve(SyncResult.RateLimited);
      }
      break;
    }

    case RequestType.UserRequest: {
      // Skip if record isn't created yet
      if (!userRecord?.UserRequest.requestTime) break;

      const { requestTime, requestsCount } = userRecord.UserRequest;
      const minsPassed = getMinsPassed(requestTime);

      if (
        (minsPassed < 3 && requestsCount > 0) ||
        (minsPassed < 30 && requestsCount >= 3)
      ) {
        return Promise.resolve(SyncResult.RateLimited);
      }
      break;
    }
    default:
      // Block bad requests
      return Promise.resolve(SyncResult.RateLimited);
  }

  return await doSync(userId)
    .then(() => {
      fakeDb[userId].lastRequestTime = now;

      if (syncType !== RequestType.Automated) {
        const { requestTime } = fakeDb[userId][syncType];

        // Set/reset request time/count
        if (!requestTime || getMinsPassed(requestTime) >= 30) {
          fakeDb[userId][syncType].requestTime = now;
          fakeDb[userId][syncType].requestsCount = 0;
        }

        fakeDb[userId][syncType].requestsCount += 1;
      }
      return SyncResult.SyncSuccessful;
    })
    .catch(() => SyncResult.SyncFailed);
}

export { syncGlucoseData, RequestType, SyncResult };
