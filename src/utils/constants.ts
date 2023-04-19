export class Constants {
  static oneSecond(): number {
    return 1;
  }

  static oneMinute(): number {
    return Constants.oneSecond() * 60;
  }

  static oneHour(): number {
    return Constants.oneMinute() * 60;
  }

  static oneDay(): number {
    return Constants.oneHour() * 24;
  }

  static oneWeek(): number {
    return Constants.oneDay() * 7;
  }

  static oneMonth(): number {
    return Constants.oneDay() * 30;
  }
}

export const VE_WEEK =
  process.env.ASH_ENV === 'alpha'
    ? 30 * 60
    : process.env.ASH_ENV === 'beta'
    ? 30 * 60
    : 7 * Constants.oneDay();
