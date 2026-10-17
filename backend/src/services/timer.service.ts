export class TimerService {
  /**
   * Returns remaining seconds for a question based on its shownAt timestamp.
   */
  static getQuestionRemainingSec(shownAt: Date, timeLimitSec: number, now = new Date()): number {
    const elapsedSec = Math.floor((now.getTime() - shownAt.getTime()) / 1000);
    return Math.max(0, timeLimitSec - elapsedSec);
  }

  /**
   * Returns remaining seconds for the total assessment based on startedAt timestamp.
   */
  static getAssessmentRemainingSec(startedAt: Date, totalLimitSec: number, now = new Date()): number {
    const elapsedSec = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    return Math.max(0, totalLimitSec - elapsedSec);
  }

  /**
   * Checks if an individual question has exceeded its allowed limit + server grace period.
   */
  static isQuestionTimedOut(
    shownAt: Date,
    timeLimitSec: number,
    gracePeriodSec: number,
    now = new Date()
  ): boolean {
    const elapsedSec = (now.getTime() - shownAt.getTime()) / 1000;
    return elapsedSec > (timeLimitSec + gracePeriodSec);
  }

  /**
   * Checks if the total assessment has exceeded the 25-minute limit + server grace period.
   */
  static isAssessmentTimedOut(
    startedAt: Date,
    totalLimitSec: number,
    gracePeriodSec: number,
    now = new Date()
  ): boolean {
    const elapsedSec = (now.getTime() - startedAt.getTime()) / 1000;
    return elapsedSec > (totalLimitSec + gracePeriodSec);
  }

  /**
   * Calculates response elapsed duration in milliseconds.
   */
  static calculateElapsedMs(shownAt: Date, answeredAt = new Date()): number {
    return Math.max(0, answeredAt.getTime() - shownAt.getTime());
  }
}
