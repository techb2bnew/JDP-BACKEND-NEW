import { successResponse } from "../helpers/responseHelper.js";
import { Job } from "../models/Job.js";
import { supabase } from "../config/database.js";

export class DashboardService {
  static async getSummary() {
    try {
      const stats = await Job.getStats();

      const [staffCountRes, laborCountRes, leadLaborCountRes] = await Promise.all([
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('labor').select('*', { count: 'exact', head: true }),
        supabase.from('lead_labor').select('*', { count: 'exact', head: true })
      ]);

      if (staffCountRes.error) throw new Error(`Database error: ${staffCountRes.error.message}`);
      if (laborCountRes.error) throw new Error(`Database error: ${laborCountRes.error.message}`);
      if (leadLaborCountRes.error) throw new Error(`Database error: ${leadLaborCountRes.error.message}`);

      const teamMembers = {
        total: (staffCountRes.count || 0) + (laborCountRes.count || 0) + (leadLaborCountRes.count || 0),
        staff: staffCountRes.count || 0,
        labor: laborCountRes.count || 0,
        lead_labor: leadLaborCountRes.count || 0
      };

      return successResponse(
        {
          total_revenue: parseFloat(stats.totalRevenue || 0),
          active_jobs: stats.active || 0,
          jobs_summary: {
            total: stats.total || 0,
            active: stats.active || 0,
            completed: stats.completed || 0,
            draft: stats.draft || 0,
            pending: stats.pending || 0
          },
          team_members: teamMembers
        },
        'Dashboard summary retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobStatusDistribution() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('status');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let activeRaw = 0;
      const counts = {
        in_progress: 0,
        completed: 0,
        pending: 0,
        on_hold: 0
      };

      (data || []).forEach(j => {
        let s = (j.status || '').toLowerCase();
        // Treat 'active' jobs as 'in_progress' for the chart
        if (s === 'active') {
          activeRaw += 1;
          s = 'in_progress';
        }
        if (s in counts) counts[s] += 1;
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const percentages = Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, parseFloat(((v / total) * 100).toFixed(1))])
      );

      const activePercentage = parseFloat((((activeRaw || 0) / (total || 1)) * 100).toFixed(1));

      // Also include 'active' alongside the merged buckets, per request
      const countsWithActive = { ...counts, active: activeRaw };
      const percentagesWithActive = { ...percentages, active: activePercentage };

      return successResponse(
        {
          counts: countsWithActive,
          percentages: percentagesWithActive,
          total
        },
        'Job status distribution retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}


