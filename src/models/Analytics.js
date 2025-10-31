import { supabase } from '../config/database.js';

const ACTIVE_JOB_STATUSES = ['active', 'in_progress'];
const ACTIVE_USER_STATUS = 'active';
const JOB_REVENUE_FIELDS = ['total_cost', 'estimated_cost'];

export class Analytics {
  static startOfDay(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  static endOfDay(date) {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d.toISOString();
  }

  static formatDateOffset(daysOffset = 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysOffset);
    return d.toISOString().slice(0, 10);
  }

  static async countActiveJobs() {
    const { count, error } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_JOB_STATUSES);

    if (error) {
      throw new Error(`Database error (active jobs): ${error.message}`);
    }

    return count || 0;
  }

  static async countActiveJobsCreatedBetween(startIso, endIso) {
    const { count, error } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_JOB_STATUSES)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (error) {
      throw new Error(`Database error (active jobs by date): ${error.message}`);
    }

    return count || 0;
  }

  static async countOnlineTeamMembers({ betweenStart, betweenEnd } = {}) {
    const applyWindow = (query, createdField = 'created_at') => {
      if (betweenStart) {
        query = query.gte(createdField, betweenStart);
      }
      if (betweenEnd) {
        query = query.lt(createdField, betweenEnd);
      }
      return query;
    };

    const staffQuery = applyWindow(
      supabase
        .from('staff')
        .select('id, user:users(status)'),
      'created_at'
    );

    const laborQuery = applyWindow(
      supabase
        .from('labor')
        .select('id, user:users!labor_user_id_fkey(status)'),
      'created_at'
    );

    const leadLaborQuery = applyWindow(
      supabase
        .from('lead_labor')
        .select('id, user:users(status)'),
      'created_at'
    );

    const [staffRes, laborRes, leadLaborRes] = await Promise.all([staffQuery, laborQuery, leadLaborQuery]);

    const process = (res, label) => {
      const { data, error } = res;
      if (error) {
        throw new Error(`Database error (${label} online team): ${error.message}`);
      }

      const count = (data || []).filter((row) => {
        const status = (row.user?.status || '').toLowerCase();
        return status === ACTIVE_USER_STATUS;
      }).length;

      return count;
    };

    const staffCount = process(staffRes, 'staff');
    const laborCount = process(laborRes, 'labor');
    const leadLaborCount = process(leadLaborRes, 'lead_labor');

    return {
      total: staffCount + laborCount + leadLaborCount,
      breakdown: {
        staff: staffCount,
        labor: laborCount,
        lead_labor: leadLaborCount
      }
    };
  }

  static async countPendingApprovals() {
    const { data, error } = await supabase
      .from('labor_timesheets')
      .select('id, status, job_status');

    if (error) {
      throw new Error(`Database error (pending approvals): ${error.message}`);
    }

    return (data || []).reduce((acc, record) => {
      const status = (record.status || record.job_status || '').toLowerCase();
      return status === 'approved' ? acc : acc + 1;
    }, 0);
  }

  static async countPendingApprovalsCreatedBetween(startIso, endIso) {
    const { data, error } = await supabase
      .from('labor_timesheets')
      .select('id, status, job_status, created_at')
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (error) {
      throw new Error(`Database error (pending approvals window): ${error.message}`);
    }

    return (data || []).reduce((acc, record) => {
      const status = (record.status || record.job_status || '').toLowerCase();
      return status === 'approved' ? acc : acc + 1;
    }, 0);
  }

  static async jobRevenueForWindow(startIso, endIso) {
    const { data, error } = await supabase
      .from('jobs')
      .select('created_at, estimated_cost')
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (error) {
      throw new Error(`Database error (job revenue): ${error.message}`);
    }

    return (data || []).reduce((sum, job) => {
      for (const field of JOB_REVENUE_FIELDS) {
        if (job[field] !== undefined && job[field] !== null) {
          const amount = parseFloat(job[field]);
          if (!Number.isNaN(amount) && amount > 0) {
            return sum + amount;
          }
        }
      }
      return sum;
    }, 0);
  }

  static async countJobsByType() {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_type');

    if (error) {
      throw new Error(`Database error (job types): ${error.message}`);
    }

    const counts = {
      service_based: 0,
      contract_based: 0
    };

    for (const job of data || []) {
      const type = (job.job_type || '').toLowerCase();
      if (type === 'service_based') {
        counts.service_based += 1;
      } else if (type === 'contract_based') {
        counts.contract_based += 1;
      }
    }

    return {
      total: (data || []).length,
      ...counts
    };
  }
}

