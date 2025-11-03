import { successResponse } from "../helpers/responseHelper.js";
import { Job } from "../models/Job.js";
import { LeadLabor } from "../models/LeadLabor.js";
import { Labor } from "../models/Labor.js";
import { Suppliers } from "../models/Suppliers.js";
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

  static async getRecentActivities(page = 1, limit = 20) {
    try {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
      const maxPerType = Math.min(limitNum, 50);

      const activities = [];

      // Helper to normalize
      const push = (items = []) => {
        items.forEach((i) => activities.push(i));
      };

      // Helper to push updated event if updated_at > created_at
      const maybePushUpdated = (rec, type, title) => {
        if (rec.updated_at && (!rec.created_at || new Date(rec.updated_at) > new Date(rec.created_at))) {
          activities.push({
            type,
            id: rec.id,
            title,
            description: title,
            timestamp: rec.updated_at
          });
        }
      };

      // Jobs created / updated / completed
      {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, job_title, status, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(j => ({
          type: 'job_created',
          id: j.id,
          title: `Job ${j.job_title} Created`,
          description: `Job created with status ${j.status}`,
          timestamp: j.created_at
        })));
        (data || []).forEach(j => maybePushUpdated(j, 'job_updated', `Job ${j.job_title} Updated`));
      }

      // Jobs completed
      {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, job_title, status, updated_at')
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(j => ({
          type: 'job_completed',
          id: j.id,
          title: `Job ${j.job_title} Completed`,
          description: 'Job marked as completed',
          timestamp: j.updated_at
        })));
      }

      // Orders created / updated
      {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, status, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(o => ({
          type: 'order_created',
          id: o.id,
          title: `New Order ${o.order_number}`,
          description: `Order status ${o.status || 'pending'}`,
          timestamp: o.created_at
        })));
        (data || []).forEach(o => maybePushUpdated(o, 'order_updated', `Order ${o.order_number} Updated`));
      }

      // Customers created / updated
      {
        const { data, error } = await supabase
          .from('customers')
          .select('id, customer_name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(c => ({
          type: 'customer_created',
          id: c.id,
          title: `Customer ${c.customer_name} Created`,
          description: 'New customer added',
          timestamp: c.created_at
        })));
        (data || []).forEach(c => maybePushUpdated(c, 'customer_updated', `Customer ${c.customer_name} Updated`));
      }

      // Staff, Labor, Lead Labor, Supplier created
      const tableToType = [
        { table: 'staff', field: 'id, created_at, updated_at, users(id, full_name)', type: 'staff_created' },
        { table: 'labor', field: 'id, created_at, updated_at, users!labor_user_id_fkey(id, full_name)', type: 'labor_created' },
        { table: 'lead_labor', field: 'id, created_at, updated_at, users!lead_labor_user_id_fkey(id, full_name)', type: 'lead_labor_created' },
        { table: 'suppliers', field: 'id, company_name, created_at, updated_at', type: 'supplier_created' }
      ];
      for (const cfg of tableToType) {
        const { data, error } = await supabase
          .from(cfg.table)
          .select(cfg.field)
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(r => {
          let name = '';
          if (cfg.table === 'suppliers') name = r.company_name || r.name || r.company || '';
          if (cfg.table === 'staff') name = r.users?.full_name || '';
          if (cfg.table === 'labor') name = r.users?.full_name || '';
          if (cfg.table === 'lead_labor') name = r.users?.full_name || '';
          const baseTitle =
            cfg.table === 'suppliers' ? `Supplier ${name} Added` :
            cfg.table === 'staff' ? `Staff ${name} Added` :
            cfg.table === 'labor' ? `Labor ${name} Added` :
            cfg.table === 'lead_labor' ? `Lead Labor ${name} Added` : 'Record Added';
          return {
            type: cfg.type,
            id: r.id,
            title: baseTitle,
            description: baseTitle,
            timestamp: r.created_at || r.updated_at || new Date().toISOString()
          };
        }));
        (data || []).forEach(r => {
          let name = r.users?.full_name || r.company_name || r.name || r.company || '';
          const updTitle = (cfg.table === 'suppliers') ? `Supplier ${name} Updated` :
                           (cfg.table === 'staff') ? `Staff ${name} Updated` :
                           (cfg.table === 'labor') ? `Labor ${name} Updated` :
                           (cfg.table === 'lead_labor') ? `Lead Labor ${name} Updated` : 'Record Updated';
          maybePushUpdated(r, cfg.type.replace('_created','_updated'), updTitle);
        });
      }

      // Products created/updated
      {
        const { data, error } = await supabase
          .from('products')
          .select('id, product_name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).flatMap(p => {
          const items = [];
          if (p.created_at) {
            items.push({
              type: 'product_created',
              id: p.id,
              title: `Product ${p.product_name} Created`,
              description: 'New product added',
              timestamp: p.created_at
            });
          }
          if (p.updated_at && (!p.created_at || new Date(p.updated_at) > new Date(p.created_at))) {
            items.push({
              type: 'product_updated',
              id: p.id,
              title: `Product ${p.product_name} Updated`,
              description: 'Product details updated',
              timestamp: p.updated_at
            });
          }
          return items;
        }));
      }

      // Bluesheets created / updated
      {
        const { data, error } = await supabase
          .from('job_bluesheet')
          .select('id, job_id, status, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(b => ({
          type: 'bluesheet_created',
          id: b.id,
          title: `Bluesheet #${b.id} Created`,
          description: `For Job ${b.job_id}`,
          timestamp: b.created_at
        })));
        (data || []).forEach(b => maybePushUpdated(b, 'bluesheet_updated', `Bluesheet #${b.id} Updated`));
      }

      // Bluesheets approved
      {
        const { data, error } = await supabase
          .from('job_bluesheet')
          .select('id, job_id, status, updated_at')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(maxPerType);
        if (error) throw new Error(`Database error: ${error.message}`);
        push((data || []).map(b => ({
          type: 'bluesheet_approved',
          id: b.id,
          title: `Bluesheet #${b.id} Approved`,
          description: `For Job ${b.job_id}`,
          timestamp: b.updated_at
        })));
      }

      // Sort and cap to limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = activities.length;
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      const offset = (pageNum - 1) * limitNum;
      const sliced = activities.slice(offset, offset + limitNum);

      return successResponse({
        items: sliced,
        total_found: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        }
      }, 'Recent activities retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  static async getManagementStats() {
    try {
      const [leadLaborStats, laborStats, supplierStats] = await Promise.all([
        LeadLabor.getStats(),
        Labor.getStats(),
        Suppliers.getStats()
      ]);

      return successResponse(
        {
          lead_labor: leadLaborStats,
          labor: laborStats,
          suppliers: supplierStats
        },
        'Management statistics retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}


