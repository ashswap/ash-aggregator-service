import { PerformanceProfiler } from './performance.profiler';
import * as Sentry from '@sentry/browser';

export class Locker {
  private static lockArray: string[] = [];

  static async lock(
    key: string,
    func: () => Promise<void>,
    log: boolean = false,
  ) {
    if (Locker.lockArray.includes(key) && log) {
      Sentry.addBreadcrumb({
        message: `${key} is already running`,
        level: 'info',
      });
      return;
    }

    Locker.lockArray.push(key);

    try {
      await func();
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          key: key,
        },
      });
    } finally {
      const index = Locker.lockArray.indexOf(key);
      if (index >= 0) {
        Locker.lockArray.splice(index, 1);
      }
    }
  }
}
