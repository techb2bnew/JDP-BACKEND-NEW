import { Analytics } from '../models/Analytics.js';

function buildChange(current, previous) {
  const difference = current - previous;
  return {
    difference,
    yesterday_total: previous
  };
}

export class AnalyticsService {
  static async getOverviewMetrics() {
    const todayDate = Analytics.formatDateOffset(0);
    const yesterdayDate = Analytics.formatDateOffset(-1);

    const todayStart = Analytics.startOfDay(todayDate);
    const tomorrowStart = Analytics.startOfDay(Analytics.formatDateOffset(1));
    const yesterdayStart = Analytics.startOfDay(yesterdayDate);
    const todayStartIso = todayStart;
    const yesterdayStartIso = yesterdayStart;
    const yesterdayEndIso = todayStart;

    const [
      jobTypeBreakdown,
      activeJobsTotal,
      activeJobsToday,
      activeJobsYesterday,
      onlineTeamTotals,
      onlineTeamToday,
      onlineTeamYesterday,
      pendingApprovalsTotal,
      pendingApprovalsToday,
      pendingApprovalsYesterday,
      revenueToday,
      revenueYesterday
    ] = await Promise.all([
      Analytics.countJobsByType(),
      Analytics.countActiveJobs(),
      Analytics.countActiveJobsCreatedBetween(todayStartIso, tomorrowStart),
      Analytics.countActiveJobsCreatedBetween(yesterdayStartIso, yesterdayEndIso),
      Analytics.countOnlineTeamMembers(),
      Analytics.countOnlineTeamMembers({ betweenStart: todayStartIso, betweenEnd: tomorrowStart }),
      Analytics.countOnlineTeamMembers({ betweenStart: yesterdayStartIso, betweenEnd: yesterdayEndIso }),
      Analytics.countPendingApprovals(),
      Analytics.countPendingApprovalsCreatedBetween(todayStartIso, tomorrowStart),
      Analytics.countPendingApprovalsCreatedBetween(yesterdayStartIso, yesterdayEndIso),
      Analytics.jobRevenueForWindow(todayStartIso, tomorrowStart),
      Analytics.jobRevenueForWindow(yesterdayStartIso, yesterdayEndIso)
    ]);

    return {
      job_types: jobTypeBreakdown,
      active_jobs: {
        total: activeJobsTotal,
        change_today_vs_yesterday: buildChange(activeJobsToday, activeJobsYesterday)
      },
      online_staff: {
        total: onlineTeamTotals.total,
        breakdown: onlineTeamTotals.breakdown,
        change_today_vs_yesterday: buildChange(onlineTeamToday.total, onlineTeamYesterday.total)
      },
      pending_approvals: {
        total: pendingApprovalsTotal,
        change_today_vs_yesterday: buildChange(pendingApprovalsToday, pendingApprovalsYesterday)
      },
      todays_revenue: {
        total: Math.round(revenueToday * 100) / 100,
        change_today_vs_yesterday: buildChange(
          Math.round(revenueToday * 100) / 100,
          Math.round(revenueYesterday * 100) / 100
        )
      }
    };
  }
}

