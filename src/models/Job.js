import { supabase } from "../config/database.js";
import { safeJsonParse } from "../utils/helpers.js";
import { LaborTimesheet } from './LaborTimesheet.js';

const ACTIVE_JOB_STATUSES = new Set(['active', 'in_progress']);
const COMPLETED_JOB_STATUSES = new Set(['completed', 'done', 'closed']);

export class Job {
  static async searchTimesheets(filters, pagination = {}) {
    try {
      // Build query with date filters
      let query = supabase
        .from('labor_timesheets')
        .select(`
          *,
          job:job_id (
            id,
            job_title
          ),
          labor:labor_id (
            id,
            users!labor_user_id_fkey (
              full_name
            )
          ),
          lead_labor:lead_labor_id (
            id,
            users!lead_labor_user_id_fkey (
              full_name
            )
          )
        `);

      // Apply date range filters
      if (filters.start_date && filters.end_date) {
        query = query.gte('date', filters.start_date).lte('date', filters.end_date);
      } else if (filters.start_date) {
        query = query.gte('date', filters.start_date);
      } else if (filters.end_date) {
        query = query.lte('date', filters.end_date);
      }

      const { data: timesheets, error } = await query.order('date', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const q = (filters.q || '').toLowerCase().trim();
      const employeeFilter = (filters.employee || '').toLowerCase().trim();
      const jobFilter = (filters.job || '').toLowerCase().trim();
      const statusFilter = (filters.status || '').toLowerCase().trim();

      const timesheetRows = [];

      for (const ts of timesheets || []) {
        const laborName = ts.labor?.users?.full_name || ts.lead_labor?.users?.full_name || 'Unknown';
        const isEmployee = laborName.toLowerCase();
        const isStatus = (ts.status || ts.job_status || '').toLowerCase();
        const jobTitle = (ts.job?.job_title || '').toLowerCase();
        const jobIdStr = (ts.job?.id || '').toString();

        // text search across employee, job title, job id
        if (q) {
          const hit = isEmployee.includes(q) || jobTitle.includes(q) || jobIdStr.includes(q);
          if (!hit) continue;
        }

        if (employeeFilter && !isEmployee.includes(employeeFilter)) continue;
        if (jobFilter && !(jobTitle.includes(jobFilter) || jobIdStr.includes(jobFilter))) continue;
        if (statusFilter && isStatus !== statusFilter) continue;

        // Calculate hours from start_time and end_time
        let hours = '00:00:00';
        if (ts.start_time && ts.end_time) {
          const start = new Date(`2000-01-01T${ts.start_time}`);
          const end = new Date(`2000-01-01T${ts.end_time}`);
          const diffMs = end - start;
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          hours = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
        }

        timesheetRows.push({
          employee: laborName,
          job: `${ts.job?.job_title} (Job-${ts.job?.id})`,
          job_id: ts.job?.id,
          labor_id: ts.labor_id || ts.lead_labor_id || null,
          date: ts.date,
          hours: hours,
          status: ts.status || ts.job_status || 'pending'
        });
      }

      // If no matches, return empty dashboard structure
      if (timesheetRows.length === 0) {
        return {
          period: {
            start_date: filters.start_date || null,
            end_date: filters.end_date || null,
            week_range: filters.start_date && filters.end_date ? `${filters.start_date} - ${filters.end_date}` : null
          },
          dashboard_timesheets: [],
          pagination: {
            current_page: pagination.page || 1,
            total_pages: 0,
            total_records: 0,
            records_per_page: pagination.limit || 10,
            has_next_page: false,
            has_prev_page: false
          }
        };
      }

      // Determine date range from filters or data
      let actualStartDate, actualEndDate;
      if (filters.start_date && filters.end_date) {
        actualStartDate = filters.start_date;
        actualEndDate = filters.end_date;
      } else {
        // Determine latest date among results, build week (Mon-Sun)
        const latest = timesheetRows.reduce((max, r) => (new Date(r.date) > new Date(max) ? r.date : max), timesheetRows[0].date);
        const latestDateObj = new Date(latest);
        const dayOfWeek = latestDateObj.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(latestDateObj);
        monday.setDate(latestDateObj.getDate() + daysToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        actualStartDate = Job.formatLocalDate(monday);
        actualEndDate = Job.formatLocalDate(sunday);
      }

      // Aggregate to weekly dashboard rows per employee+job
      const buckets = new Map();
      const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      // Pre-fill function
      const ensureRow = (key, employee, jobTitle, jobId, laborId) => {
        if (!buckets.has(key)) {
          const base = { employee, job: `${jobTitle} (Job-${jobId})`, job_id: jobId, labor_id: laborId };
          dayNames.forEach(d => base[d] = '0h');
          base.total = '0h';
          base.billable = '0h';
          base.status = 'Draft';
          buckets.set(key, base);
        }
        return buckets.get(key);
      };

      const statusCountsByKey = new Map();

      timesheetRows.forEach(r => {
        // Only include entries within the computed week
        if (r.date < actualStartDate || r.date > actualEndDate) return;
        const key = `${r.employee}|${r.job_id}|${r.labor_id || ''}`;
        const row = ensureRow(key, r.employee, r.job.split(' (Job-')[0], r.job_id, r.labor_id);

        // Day index
        const dt = new Date(r.date);
        const dow = dt.getDay();
        const idx = dow === 0 ? 6 : dow - 1;
        const dayKey = dayNames[idx];

        const hoursVal = Job.timeToHours(r.hours || '00:00:00');

        // Sum day hours if multiple entries same day
        const existing = parseFloat((row[dayKey] || '0h').replace('h', '').replace('m', ''));
        // existing is coarse; recompute by storing numeric map would be ideal, but keep simple: override with formatted hours
        row[dayKey] = Job.formatTimeDisplay(hoursVal + (isNaN(existing) ? 0 : existing));

        const currentTotal = Job.timeToHours(row.total.replace('h', '').replace('m', '').includes('m') ? '00:00:00' : row.total);
        row.total = Job.formatTimeDisplay(currentTotal + hoursVal);
        row.billable = row.total;

        const normalized = (r.status || 'pending').toLowerCase();
        const sc = statusCountsByKey.get(key) || {};
        sc[normalized] = (sc[normalized] || 0) + 1;
        statusCountsByKey.set(key, sc);
      });

      // Derive status per row
      buckets.forEach((row, key) => {
        const sc = statusCountsByKey.get(key) || {};
        if (sc.approved > 0) row.status = 'Approved';
        else if (sc.submitted > 0) row.status = 'Submitted';
        else if (sc.active > 0) row.status = 'Active';
        else if (sc.pending > 0) row.status = 'Pending';
        else if (sc.rejected > 0) row.status = 'Rejected';
      });

      const dashboard = Array.from(buckets.values());

      // Apply pagination
      const { page = 1, limit = 10 } = pagination;
      const totalRecords = dashboard.length;
      const totalPages = Math.ceil(totalRecords / limit);
      const offset = (page - 1) * limit;
      const paginatedData = dashboard.slice(offset, offset + limit);

      return {
        period: {
          start_date: actualStartDate,
          end_date: actualEndDate,
          week_range: `${actualStartDate} - ${actualEndDate}`
        },
        dashboard_timesheets: paginatedData,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }
  static async fetchLeadLaborDetails(leadLaborIds) {
    try {
      if (!Array.isArray(leadLaborIds) || leadLaborIds.length === 0) {
        return [];
      }

      // Optimize: Fetch all lead labor data in one query
      const { data: leadLaborData, error } = await supabase
        .from("lead_labor")
        .select(`
          id,
          labor_code,
          department,
          specialization,
          trade,
          experience,
          user_id
        `)
        .in("id", leadLaborIds);

      if (error) {
        console.error("Error fetching lead labor:", error);
        return [];
      }

      if (!leadLaborData || leadLaborData.length === 0) {
        return [];
      }

      // Optimize: Batch fetch all users in one query instead of individual queries
      const userIds = leadLaborData.map(ll => ll.user_id).filter(Boolean);
      let usersMap = new Map();

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        if (!usersError && usersData) {
          usersData.forEach(user => {
            usersMap.set(user.id, user);
          });
        }
      }

      // Map users to lead labor efficiently
      const leadLaborWithUsers = leadLaborData.map(leadLabor => ({
        ...leadLabor,
        user: usersMap.get(leadLabor.user_id) || null
      }));

      return leadLaborWithUsers;
    } catch (error) {
      console.error("Error in fetchLeadLaborDetails:", error);
      return [];
    }
  }

  static async fetchLaborDetails(laborIds) {
    try {
      if (!Array.isArray(laborIds) || laborIds.length === 0) {
        return [];
      }

      // Optimize: Fetch all labor data in one query
      const { data: laborData, error } = await supabase
        .from("labor")
        .select(`
          id,
          labor_code,
          trade,
          experience,
          hourly_rate,
          hours_worked,
          total_cost,
          availability,
          user_id
        `)
        .in("id", laborIds);

      if (error) {
        console.error("Error fetching labor:", error);
        return [];
      }

      if (!laborData || laborData.length === 0) {
        return [];
      }

      // Optimize: Batch fetch all users in one query instead of individual queries
      const userIds = laborData.map(l => l.user_id).filter(Boolean);
      let usersMap = new Map();

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        if (!usersError && usersData) {
          usersData.forEach(user => {
            usersMap.set(user.id, user);
          });
        }
      }

      // Map users to labor efficiently
      const laborWithUsers = laborData.map(labor => ({
        ...labor,
        user: usersMap.get(labor.user_id) || null
      }));

      return laborWithUsers;
    } catch (error) {
      console.error("Error in fetchLaborDetails:", error);
      return [];
    }
  }

  static async fetchMaterialsDetails(jobId) {
    try {
      if (!jobId) {
        return [];
      }

      const { data: materialData, error } = await supabase
        .from("products")
        .select(`
          id,
          product_name,
          supplier_sku,
          jdp_sku,
          unit_cost,
          total_cost,
          stock_quantity,
          unit,
          supplier_id,
          created_at,
          updated_at,
          supplier:suppliers!products_supplier_id_fkey(
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            user:users!suppliers_user_id_fkey(
              id,
              full_name,
              email,
              phone,
              photo_url
            )
          )
        `)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error fetching materials:", error);
        return [];
      }

      return materialData || [];
    } catch (error) {
      console.error("Error in fetchMaterialsDetails:", error);
      return [];
    }
  }

  static async fetchOrdersDetails(jobId) {
    try {
      if (!jobId) {
        return [];
      }

      // Optimize: Fetch orders first (includes order IDs we need for items query)
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_date,
          status,
          total_amount,
          payment_status,
          payment_method,
          notes,
          created_at,
          updated_at,
          customer:customers!orders_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!orders_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            supplier_code,
            company_name,
            contact_person
          ),
          lead_labour:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            user_id,
            department,
            specialization
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return [];
      }

      if (!ordersData || ordersData.length === 0) {
        return [];
      }

      // Optimize: Fetch all order items in one query for all orders (eliminates N+1 problem)
      const orderIds = ordersData.map(o => o.id);
      const { data: allOrderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          total_price,
          created_at,
          updated_at,
          product:products!order_items_product_id_fkey(
            id,
            product_name,
            jdp_sku,
            supplier_sku,
            jdp_price,
            estimated_price,
            supplier_cost_price,
            markup_percentage,
            stock_quantity,
            unit,
            category,
            description
          )
        `)
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        // Return orders without items if items fetch fails
        return ordersData.map(order => ({ ...order, items: [] }));
      }

      // Optimize: Build a Map for O(1) lookup of items by order_id
      const itemsByOrderId = new Map();
      if (allOrderItems && allOrderItems.length > 0) {
        allOrderItems.forEach(item => {
          if (!itemsByOrderId.has(item.order_id)) {
            itemsByOrderId.set(item.order_id, []);
          }
          itemsByOrderId.get(item.order_id).push(item);
        });
      }

      // Map items to orders efficiently
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        items: itemsByOrderId.get(order.id) || []
      }));

      return ordersWithItems;
    } catch (error) {
      console.error("Error in fetchOrdersDetails:", error);
      return [];
    }
  }

  static async fetchCustomLaborDetails(jobId) {
    try {
      if (!jobId) {
        return [];
      }

      const { data: customLaborData, error } = await supabase
        .from("labor")
        .select(`
          id,
          labor_code,
          trade,
          experience,
          hourly_rate,
          hours_worked,
          total_cost,
          availability,
          is_custom,
          job_id,
          user_id,
          user:users!labor_user_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq("job_id", jobId)
        .eq("is_custom", true);

      if (error) {
        console.error("Error fetching custom labor:", error);
        return [];
      }

      return customLaborData || [];
    } catch (error) {
      console.error("Error in fetchCustomLaborDetails:", error);
      return [];
    }
  }

  static async addDetailsToJob(job) {
    const jobWithDetails = { ...job };

    const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
    const laborIds = safeJsonParse(job.assigned_labor_ids, []);

    // Run all detail fetches in parallel for maximum performance
    const [
      assignedLeadLabor,
      assignedLabor,
      assignedMaterials,
      customLabor,
      orders,
      laborTimesheets,
      bluesheets
    ] = await Promise.all([
      Job.fetchLeadLaborDetails(leadLaborIds),
      Job.fetchLaborDetails(laborIds),
      Job.fetchMaterialsDetails(job.id),
      Job.fetchCustomLaborDetails(job.id),
      Job.fetchOrdersDetails(job.id),
      LaborTimesheet.findByJobId(job.id),
      Job.fetchBluesheetsDetails(job.id)
    ]);

    jobWithDetails.assigned_lead_labor = assignedLeadLabor;
    jobWithDetails.assigned_labor = assignedLabor;
    jobWithDetails.assigned_materials = assignedMaterials;
    jobWithDetails.custom_labor = customLabor;
    jobWithDetails.orders = orders;
    jobWithDetails.labor_timesheets = laborTimesheets;
    jobWithDetails.bluesheets = bluesheets;

    return jobWithDetails;
  }

  // Fetch bluesheets details for a job
  static async fetchBluesheetsDetails(jobId) {
    try {
      const { data: bluesheets, error } = await supabase
        .from('job_bluesheet')
        .select(`
          *,
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          ),
          labor_entries:job_bluesheet_labor (
            id,
            labor_id,
            lead_labor_id,
            employee_name,
            role,
            labor_hours,
            regular_hours,
            overtime_hours,
            total_hours,
            hourly_rate,
          total_cost,
          rate_snapshot,
            labor:labor_id (
              id,
              labor_code,
              users!labor_user_id_fkey (
                id,
                full_name,
                email
              )
            ),
            lead_labor:lead_labor_id (
              id,
              labor_code,
              users!lead_labor_user_id_fkey (
                id,
                full_name,
                email
              )
            )
          ),
          material_entries:job_bluesheet_material (
            id,
            product_id,
            material_name,
            quantity,
            unit,
            total_ordered,
            material_used,
            supplier_order_id,
            return_to_warehouse,
            unit_cost,
            total_cost,
            product:product_id (
              id,
              product_name,
              jdp_price,
              supplier_cost_price
            )
          )
        `)
        .eq('job_id', jobId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching bluesheets:', error);
        return [];
      }

      return bluesheets || [];
    } catch (error) {
      console.error('Error in fetchBluesheetsDetails:', error);
      return [];
    }
  }

  static async create(jobData) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert([jobData])
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Job.addDetailsToJob(data);
    } catch (error) {
      throw error;
    }
  }

  static async findById(jobId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone,
            address
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone,
            address
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", jobId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Job.addDetailsToJob(data);
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone,
            address
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone,
            address
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.job_type) {
        query = query.eq("job_type", filters.job_type);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.contractor_id) {
        query = query.eq("contractor_id", filters.contractor_id);
      }
      if (filters.created_from) {
        query = query.eq("created_from", filters.created_from);
      }
      if (filters.search) {
        query = query.or(`job_title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return {
        jobs: jobsWithDetails,
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async search(searchText, pagination = {}) {
    try {
      const q = (searchText || '').toLowerCase().trim();

      let baseQuery = supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone,
            address
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone,
            address
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `);

      const { data, error } = await baseQuery.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      const normalizeType = (val) => (val || '')
        .toString()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .trim();

      const matches = (job) => {
        const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

        const jobMatch = inStr(job.job_title) || inStr(job.description);
        const customerMatch = inStr(job.customer?.customer_name) || inStr(job.customer?.company_name);
        const contractorMatch = inStr(job.contractor?.contractor_name) || inStr(job.contractor?.company_name);

        const laborMatch = Array.isArray(job.assigned_labor)
          ? job.assigned_labor.some(l => inStr(l.user?.full_name))
          : false;

        const leadLaborMatch = Array.isArray(job.assigned_lead_labor)
          ? job.assigned_lead_labor.some(l => inStr(l.user?.full_name))
          : false;

        let typeMatch = true;
        if (pagination.job_type && pagination.job_type.toString().trim().length > 0) {
          const jt = normalizeType(pagination.job_type);
          if (jt !== 'all' && jt !== 'all_types') {
            typeMatch = normalizeType(job.job_type) === jt;
          }
        }

        let statusMatch = true;
        if (pagination.status && pagination.status.toString().trim().length > 0) {
          const raw = pagination.status.toString().toLowerCase();
          const list = raw.split(',').map(s => s.trim()).filter(Boolean);
          if (list.length > 0) {
            const jobStatus = (job.status || '').toString().toLowerCase();
            statusMatch = list.includes(jobStatus);
          }
        }

        let priorityMatch = true;
        if (pagination.priority && pagination.priority.toString().trim().length > 0) {
          const rawP = pagination.priority.toString().toLowerCase();
          const listP = rawP.split(',').map(s => s.trim()).filter(Boolean);
          if (listP.length > 0) {
            const jobPriority = (job.priority || '').toString().toLowerCase();
            priorityMatch = listP.includes(jobPriority);
          }
        }

        if (!q) {
          return typeMatch && statusMatch && priorityMatch;
        }
        return (jobMatch || customerMatch || contractorMatch || laborMatch || leadLaborMatch) && typeMatch && statusMatch && priorityMatch;
      };

      const filtered = jobsWithDetails.filter(matches);

      // Debug logging
      console.log('Total jobs fetched:', jobsWithDetails.length);
      console.log('Filter params:', { job_type: pagination.job_type, status: pagination.status, q });
      console.log('Filtered jobs count:', filtered.length);
      if (pagination.job_type) {
        const typeCounts = {};
        jobsWithDetails.forEach(job => {
          const type = job.job_type || 'null';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        console.log('Job type distribution:', typeCounts);
      }

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        jobs: sliced,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(jobId, updateData) {
    try {
      // Clean updateData - remove undefined/null values and handle JSON fields
      const cleanedUpdateData = { ...updateData };
      
      // Ensure JSON array fields are properly stringified if they're arrays
      if (cleanedUpdateData.assigned_lead_labor_ids && Array.isArray(cleanedUpdateData.assigned_lead_labor_ids)) {
        cleanedUpdateData.assigned_lead_labor_ids = JSON.stringify(cleanedUpdateData.assigned_lead_labor_ids);
      }
      if (cleanedUpdateData.assigned_labor_ids && Array.isArray(cleanedUpdateData.assigned_labor_ids)) {
        cleanedUpdateData.assigned_labor_ids = JSON.stringify(cleanedUpdateData.assigned_labor_ids);
      }
      if (cleanedUpdateData.assigned_material_ids && Array.isArray(cleanedUpdateData.assigned_material_ids)) {
        cleanedUpdateData.assigned_material_ids = JSON.stringify(cleanedUpdateData.assigned_material_ids);
      }

      // Remove undefined values to avoid unnecessary updates
      Object.keys(cleanedUpdateData).forEach(key => {
        if (cleanedUpdateData[key] === undefined) {
          delete cleanedUpdateData[key];
        }
      });

      // Optimize: Run job existence check and foreign key validation in PARALLEL
      const checkPromises = [
        // Job existence check
        supabase
          .from("jobs")
          .select("id")
          .eq("id", jobId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error && error.code !== 'PGRST116') {
              throw new Error(`Database error: ${error.message}`);
            }
            if (!data) {
              throw new Error("Job not found");
            }
            return data;
          })
      ];

      // Add foreign key validations to parallel checks
      if (cleanedUpdateData.customer_id !== undefined && cleanedUpdateData.customer_id !== null) {
        checkPromises.push(
          supabase
            .from('customers')
            .select('id')
            .eq('id', cleanedUpdateData.customer_id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error && error.code !== 'PGRST116') {
                throw new Error(`Database error while validating customer: ${error.message}`);
              }
              if (!data) {
                throw new Error(`Customer with ID ${cleanedUpdateData.customer_id} does not exist`);
              }
            })
        );
      }

      if (cleanedUpdateData.contractor_id !== undefined && cleanedUpdateData.contractor_id !== null) {
        checkPromises.push(
          supabase
            .from('contractors')
            .select('id')
            .eq('id', cleanedUpdateData.contractor_id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error && error.code !== 'PGRST116') {
                throw new Error(`Database error while validating contractor: ${error.message}`);
              }
              if (!data) {
                throw new Error(`Contractor with ID ${cleanedUpdateData.contractor_id} does not exist`);
              }
            })
        );
      }

      // Wait for all checks to complete in parallel
      await Promise.all(checkPromises);

      // Perform the update (without select to save time)
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          ...cleanedUpdateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId);

      if (updateError) {
        // Handle specific Supabase errors
        if (updateError.code === '23505') {
          throw new Error(`Database constraint violation: ${updateError.message}`);
        }
        if (updateError.code === '23503') {
          if (updateError.message.includes('customer_id')) {
            throw new Error(`Customer with the provided ID does not exist`);
          }
          if (updateError.message.includes('contractor_id')) {
            throw new Error(`Contractor with the provided ID does not exist`);
          }
          throw new Error(`Foreign key constraint violation: ${updateError.message}`);
        }
        throw new Error(`Database error: ${updateError.message}`);
      }

      // Optimize: Fetch updated job data with minimal joins (only essential fields)
      // This is faster than full joins
      const { data, error: selectError } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", jobId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        // If select fails with actual error, try simple fetch without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .maybeSingle();
        
        if (simpleError && simpleError.code !== 'PGRST116') {
          throw new Error(`Database error: ${simpleError.message}`);
        }
        
        if (!simpleData) {
          throw new Error("Job not found after update");
        }
        
        // Return simple data if join query failed
        return simpleData;
      }

      if (!data) {
        throw new Error("Job not found after update");
      }

      // Return updated job (no addDetailsToJob - too slow)
      return data;
    } catch (error) {
      // Re-throw known errors as-is
      if (error.message.includes("not found") || 
          error.message.includes("Database error") ||
          error.message.includes("does not exist") ||
          error.message.includes("constraint violation")) {
        throw error;
      }
      throw new Error(`Failed to update job: ${error.message}`);
    }
  }

  // Method to update with full details (if needed in future)
  static async updateWithDetails(jobId, updateData) {
    try {
      const updatedJob = await Job.update(jobId, updateData);
      if (!updatedJob) return null;
      return await Job.addDetailsToJob(updatedJob);
    } catch (error) {
      throw error;
    }
  }

  static async delete(jobId) {
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLabor(laborId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      if (!laborId) {
        throw new Error('laborId is required');
      }

      // Optimize: Use text search to find only jobs that might contain this labor ID
      // Remove count from initial query - calculate from filtered results (faster)
      const { data: potentialJobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .ilike('assigned_labor_ids', `%${laborId}%`) // Fast text search - finds potential matches
        .order('created_at', { ascending: false });

      if (jobsError) {
        throw new Error(`Database error: ${jobsError.message}`);
      }

      // Optimize: Single pass - filter, calculate summary, and paginate all at once
      const targetId = parseInt(laborId);
      const filteredJobs = [];
      const jobsArray = potentialJobs || [];
      let activeJobs = 0;
      let completedJobs = 0;
      const startIdx = offset;
      const endIdx = offset + limit;
      
      // Single pass: filter jobs, calculate summary, and build paginated array
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        try {
          let laborIds = [];
          if (typeof job.assigned_labor_ids === 'string') {
            laborIds = safeJsonParse(job.assigned_labor_ids, []);
          } else if (Array.isArray(job.assigned_labor_ids)) {
            laborIds = job.assigned_labor_ids;
          }

          // Verify the ID is actually in the array (not just a substring match)
          const hasMatch = laborIds.some(id => parseInt(id) === targetId);
          if (hasMatch) {
            filteredJobs.push(job);
            
            // Calculate summary while filtering
            const status = (job.status || '').toLowerCase();
            if (ACTIVE_JOB_STATUSES.has(status)) {
              activeJobs += 1;
            }
            if (COMPLETED_JOB_STATUSES.has(status)) {
              completedJobs += 1;
            }
          }
        } catch (e) {
          console.error('Error parsing labor IDs:', e);
          // Skip this job if parsing fails
        }
      }

      // Paginate filtered jobs
      const totalJobs = filteredJobs.length;
      const paginatedJobs = filteredJobs.slice(startIdx, endIdx);
      const totalPages = Math.ceil(totalJobs / limit);

      // Optimize: Don't call addDetailsToJob for list view - it's too slow
      // Jobs already have customer, contractor, created_by_user from initial query
      // If full details are needed, client can call getJobById separately
      // This saves ~200-400ms per job (7 queries per job avoided)

      return {
        jobs: paginatedJobs, // Return jobs without addDetailsToJob (much faster)
        total: totalJobs,
        page: page,
        limit: limit,
        totalPages: totalPages,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalJobs,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        // Include summary in response to avoid separate query
        summary: {
          total_jobs: totalJobs,
          active_jobs: activeJobs,
          completed_jobs: completedJobs
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getJobStatusSummaryByLabor(laborId) {
    try {
      if (!laborId) {
        throw new Error('laborId is required');
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, assigned_labor_ids');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const targetId = parseInt(laborId);
      let totalJobs = 0;
      let activeJobs = 0;
      let completedJobs = 0;

      for (const job of data || []) {
        let laborIds = [];
        if (typeof job.assigned_labor_ids === 'string') {
          laborIds = safeJsonParse(job.assigned_labor_ids, []);
        } else if (Array.isArray(job.assigned_labor_ids)) {
          laborIds = job.assigned_labor_ids;
        }

        const hasMatch = laborIds.some((id) => parseInt(id) === targetId);
        if (!hasMatch) {
          continue;
        }

        totalJobs += 1;
        const status = (job.status || '').toLowerCase();
        if (ACTIVE_JOB_STATUSES.has(status)) {
          activeJobs += 1;
        }
        if (COMPLETED_JOB_STATUSES.has(status)) {
          completedJobs += 1;
        }
      }

      return {
        total_jobs: totalJobs,
        active_jobs: activeJobs,
        completed_jobs: completedJobs
      };
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLeadLabor(leadLaborId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      if (!leadLaborId) {
        throw new Error('leadLaborId is required');
      }


      // Optimize: Use text search to find only jobs that might contain this lead labor ID
      // Remove count from initial query - calculate from filtered results (faster)
      const { data: potentialJobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .ilike('assigned_lead_labor_ids', `%${leadLaborId}%`) // Fast text search - finds potential matches
        .order('created_at', { ascending: false });

      if (jobsError) {
        throw new Error(`Database error: ${jobsError.message}`);
      }

      // Optimize: Single pass - filter, calculate summary, and paginate all at once
      const targetId = parseInt(leadLaborId);
      const filteredJobs = [];
      const jobsArray = potentialJobs || [];
      let activeJobs = 0;
      let completedJobs = 0;
      let thisWeekJobs = 0;
      const startIdx = offset;
      const endIdx = offset + limit;
      
      // Calculate this week's start (Monday 00:00:00) and end (Sunday 23:59:59)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to get to Monday
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Single pass: filter jobs, calculate summary, and build paginated array
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        try {
          let leadLaborIds = [];
          if (typeof job.assigned_lead_labor_ids === 'string') {
            leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
          } else if (Array.isArray(job.assigned_lead_labor_ids)) {
            leadLaborIds = job.assigned_lead_labor_ids;
          }

          // Verify the ID is actually in the array (not just a substring match)
          const hasMatch = leadLaborIds.some(id => parseInt(id) === targetId);
          if (hasMatch) {
            filteredJobs.push(job);
            
            // Calculate summary while filtering
            const status = (job.status || '').toLowerCase();
            if (ACTIVE_JOB_STATUSES.has(status)) {
              activeJobs += 1;
            }
            if (COMPLETED_JOB_STATUSES.has(status)) {
              completedJobs += 1;
            }
            
            // Check if job was created this week
            if (job.created_at) {
              const jobCreatedAt = new Date(job.created_at);
              if (jobCreatedAt >= startOfWeek && jobCreatedAt <= endOfWeek) {
                thisWeekJobs += 1;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing lead labor IDs:', e);
          // Skip this job if parsing fails
        }
      }

      // Paginate filtered jobs
      const totalJobs = filteredJobs.length;
      const paginatedJobs = filteredJobs.slice(startIdx, endIdx);

      // Optimize: Don't call addDetailsToJob for list view - it's too slow
      // Jobs already have customer, contractor, created_by_user from initial query
      // If full details are needed, client can call getJobById separately
      // This saves ~200-400ms per job (7 queries per job avoided)

      const totalPages = Math.ceil(filteredJobs.length / limit);

      return {
        jobs: paginatedJobs, // Return jobs without addDetailsToJob (much faster)
        total: filteredJobs.length,
        page: page,
        limit: limit,
        totalPages: totalPages,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: filteredJobs.length,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        // Include summary in response to avoid separate query
        summary: {
          total_jobs: totalJobs,
          active_jobs: activeJobs,
          completed_jobs: completedJobs,
          this_week_jobs: thisWeekJobs
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTodayJobsByLeadLabor(leadLaborId, page = 1, limit = 10) {
    try {
      if (!leadLaborId) {
        throw new Error('leadLaborId is required');
      }

      const targetId = parseInt(leadLaborId);
      const offset = (page - 1) * limit;

      // Calculate today's start and end (00:00:00 to 23:59:59)
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch jobs created today that potentially include this lead labor ID
      const { data: potentialJobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .ilike('assigned_lead_labor_ids', `%${leadLaborId}%`)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (jobsError) {
        throw new Error(`Database error: ${jobsError.message}`);
      }

      const filteredJobs = [];
      const jobsArray = potentialJobs || [];
      let activeJobs = 0;
      let completedJobs = 0;

      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        try {
          let leadLaborIds = [];
          if (typeof job.assigned_lead_labor_ids === 'string') {
            leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
          } else if (Array.isArray(job.assigned_lead_labor_ids)) {
            leadLaborIds = job.assigned_lead_labor_ids;
          }

          const hasMatch = leadLaborIds.some((id) => parseInt(id) === targetId);
          if (hasMatch) {
            filteredJobs.push(job);

            const status = (job.status || '').toLowerCase();
            if (ACTIVE_JOB_STATUSES.has(status)) {
              activeJobs += 1;
            }
            if (COMPLETED_JOB_STATUSES.has(status)) {
              completedJobs += 1;
            }
          }
        } catch (e) {
          console.error('Error parsing lead labor IDs:', e);
        }
      }

      const totalJobs = filteredJobs.length;
      const paginatedJobs = filteredJobs.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalJobs / limit);

      return {
        jobs: paginatedJobs,
        total: totalJobs,
        page,
        limit,
        totalPages,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalJobs,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          total_jobs: totalJobs,
          active_jobs: activeJobs,
          completed_jobs: completedJobs
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalJobs, error: totalError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: activeJobs, error: activeError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "active");

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      const { data: completedJobs, error: completedError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "completed");

      if (completedError) {
        throw new Error(`Database error: ${completedError.message}`);
      }

      const { data: draftJobs, error: draftError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "draft");

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      const { data: pendingJobs, error: pendingError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "pending");

      if (pendingError) {
        throw new Error(`Database error: ${pendingError.message}`);
      }
      const { data: revenueData, error: revenueError } = await supabase
        .from("jobs")
        .select("estimated_cost");

      if (revenueError) {
        throw new Error(`Database error: ${revenueError.message}`);
      }

      const total = totalJobs?.length || 0;
      const active = activeJobs?.length || 0;
      const completed = completedJobs?.length || 0;
      const draft = draftJobs?.length || 0;
      const pending = pendingJobs?.length || 0;

      const totalRevenue = (revenueData || []).reduce((sum, job) => {
        return sum + (parseFloat(job.estimated_cost) || 0);
      }, 0);

      return {
        total,
        active,
        completed,
        draft,
        pending,
        totalRevenue: totalRevenue.toFixed(2),
        activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        completedPercentage: total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0",
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByCustomerId(customerId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return jobsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static async findByContractorId(contractorId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          )
        `)
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return jobsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static async getJobDashboardDetails(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        return null;
      }

      const materialUsage = await Job.getJobMaterialUsage(jobId);

      const dashboardData = {
        ...job,

        projectSummary: {
          jobEstimate: parseFloat(job.estimated_cost) || 0,
          materialCost: 0,
          laborCost: 0,
          actualProjectCost: 0,
          projectProgress: 0
        },

        keyMetrics: {
          totalHoursWorked: 0,
          totalMaterialUsed: 0,
          totalLabourEntries: 0
        },


        materialUsage: {
          totalCost: 0,
          materials: materialUsage
        },


        laborSummary: {
          totalCost: 0,
          laborEntries: [],
          leadLaborEntries: job.assigned_lead_labor || []
        }
      };


      if (materialUsage && materialUsage.length > 0) {
        const materialCost = materialUsage.reduce((sum, material) => {
          return sum + (parseFloat(material.total_cost) || 0);
        }, 0);
        dashboardData.projectSummary.materialCost = materialCost;
        dashboardData.materialUsage.totalCost = materialCost;
        dashboardData.keyMetrics.totalMaterialUsed = materialUsage.length;
      }



      if (transactions && transactions.length > 0) {
        const invoiceCount = transactions.filter(t =>
          t.invoice_type.includes('invoice')
        ).length;
        dashboardData.keyMetrics.numberOfInvoices = invoiceCount;
      }


      dashboardData.projectSummary.actualProjectCost =
        dashboardData.projectSummary.materialCost +
        dashboardData.projectSummary.laborCost;


      const progressMap = {
        'draft': 0,
        'active': 25,
        'in_progress': 50,
        'completed': 100,
        'cancelled': 0,
        'on_hold': 25
      };
      dashboardData.projectSummary.projectProgress = progressMap[job.status] || 0;

      return dashboardData;
    } catch (error) {
      throw error;
    }
  }





  static async getJobMaterialUsage(jobId) {
    try {
      const { data, error } = await supabase
        .from("job_material_usage")
        .select("*")
        .eq("job_id", jobId)
        .order("usage_date", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }


  static async createJobTransaction(transactionData) {
    try {
      const { data, error } = await supabase
        .from("job_transactions")
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }


  static async createJobTimeLog(timeLogData) {
    try {
      const { data, error } = await supabase
        .from("job_time_logs")
        .insert([timeLogData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }


  static async createJobMaterialUsage(materialUsageData) {
    try {
      const { data, error } = await supabase
        .from("job_material_usage")
        .insert([materialUsageData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }


  static async updateWorkActivity(jobId, activityCount) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      if (typeof activityCount !== 'number' || activityCount < 0) {
        throw new Error('Activity count must be a positive number');
      }


      const { data, error } = await supabase
        .from("jobs")
        .update({
          work_activity: activityCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async updateTotalWorkTime(jobId, workTime) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }


      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(workTime)) {
        throw new Error('Invalid time format. Use HH:MM:SS');
      }

      const { data, error } = await supabase
        .from("jobs")
        .update({
          total_work_time: workTime,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getWorkActivityHistory(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }


      let totalHoursWorked = 0;
      if (job.assigned_labor && job.assigned_labor.length > 0) {
        totalHoursWorked = job.assigned_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
      }

      if (job.custom_labor && job.custom_labor.length > 0) {
        const customHours = job.custom_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
        totalHoursWorked += customHours;
      }

      let totalMaterialUsed = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        totalMaterialUsed = job.assigned_materials.length;
      }

      let totalLabourEntries = 0;
      if (job.assigned_labor) {
        totalLabourEntries += job.assigned_labor.length;
      }
      if (job.custom_labor) {
        totalLabourEntries += job.custom_labor.length;
      }

      const numberOfInvoices = 0;

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        jobStatus: job.status,
        jobPriority: job.priority,
        dashboardMetrics: {
          totalHoursWorked: {
            value: totalHoursWorked,
            unit: "hours",
            color: "blue"
          },
          totalMaterialUsed: {
            value: totalMaterialUsed,
            unit: "items",
            color: "green"
          },
          totalLabourEntries: {
            value: totalLabourEntries,
            unit: "entries",
            color: "purple"
          },
          numberOfInvoices: {
            value: numberOfInvoices,
            unit: "invoices",
            color: "orange"
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        },
        jobDetails: {
          jobType: job.job_type,
          estimatedHours: job.estimated_hours || 0,
          estimatedCost: job.estimated_cost || 0,
          dueDate: job.due_date,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        },
        totalWorkTime: job.total_work_time,
        activityCount: job.work_activity || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateWorkData(jobId, updateData) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const { data: freshJobData, error: freshJobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (freshJobError) {
        throw new Error(`Database error: ${freshJobError.message}`);
      }

      if (!freshJobData) {
        throw new Error('Job not found');
      }

      if (freshJobData.labor_timesheets) {
        console.log(`Raw labor_timesheets length:`, freshJobData.labor_timesheets.length);
      }

      const job = freshJobData;

      const updateFields = {
        updated_at: new Date().toISOString()
      };


      if (updateData.work_activity !== undefined) {
        if (typeof updateData.work_activity !== 'number' || updateData.work_activity < 0) {
          throw new Error('Work activity must be a positive number');
        }
        updateFields.work_activity = updateData.work_activity;
      }


      if (updateData.total_work_time) {

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(updateData.total_work_time)) {
          throw new Error('Invalid time format. Use HH:MM:SS');
        }
        updateFields.total_work_time = updateData.total_work_time;
      }

      if (updateData.start_timer) {
        updateFields.start_timer = updateData.start_timer;
      }

      if (updateData.end_timer) {
        updateFields.end_timer = updateData.end_timer;
      }

      if (updateData.pause_timer !== undefined) {
        if (Array.isArray(updateData.pause_timer)) {
          updateFields.pause_timer = JSON.stringify(updateData.pause_timer);
        } else {
          updateFields.pause_timer = JSON.stringify([updateData.pause_timer]);
        }
      }

      if (updateData.status) {
        const validStatuses = ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        updateFields.status = updateData.status;
      }


      if (updateData.bulk_timesheets) {
        const bulkTimesheets = updateData.bulk_timesheets;

        if (!Array.isArray(bulkTimesheets)) {
          throw new Error('bulk_timesheets must be an array');
        }

        // Process each timesheet entry and save to new table
        for (const timesheetData of bulkTimesheets) {
          if (!timesheetData.labor_id || !timesheetData.date) {
            throw new Error('labor_id and date are required for each timesheet entry');
          }

          // Check if entry already exists
          const existingEntries = await LaborTimesheet.findByJobId(jobId);
          const existingEntry = existingEntries.find(entry =>
            entry.labor_id === timesheetData.labor_id &&
            entry.date === timesheetData.date
          );

          // Prepare timesheet data for new table
          const timesheetEntryData = {
            labor_id: timesheetData.labor_id,
            lead_labor_id: timesheetData.lead_labor_id || null,
            job_id: jobId,
            date: timesheetData.date,
            start_time: timesheetData.start_time || null,
            end_time: timesheetData.end_time || null,
            work_activity: timesheetData.work_activity || null,
            pause_timer: timesheetData.pause_timer || [],
            job_status: timesheetData.job_status || 'in_progress',
            status: timesheetData.status || 'draft'
          };

          if (existingEntry) {
            // Update existing entry
            await LaborTimesheet.update(existingEntry.id, timesheetEntryData);
          } else {
            // Create new entry
            await LaborTimesheet.create(timesheetEntryData);
          }
        }
      }


      if (updateData.labor_timesheet) {
        const timesheetData = updateData.labor_timesheet;

        if (!timesheetData.date) {
          throw new Error('date is required for timesheet');
        }

        if (!timesheetData.labor_id && !timesheetData.lead_labor_id) {
          throw new Error('either labor_id or lead_labor_id is required for timesheet');
        }

        // Check if entry already exists
        const existingEntries = await LaborTimesheet.findByJobId(jobId);
        const existingEntry = existingEntries.find(entry => {
          if (timesheetData.lead_labor_id) {
            return entry.lead_labor_id === timesheetData.lead_labor_id && entry.date === timesheetData.date;
          } else {
            return entry.labor_id === timesheetData.labor_id && entry.date === timesheetData.date;
          }
        });

        // Prepare timesheet data for new table
        const timesheetEntryData = {
          labor_id: timesheetData.labor_id || null,
          lead_labor_id: timesheetData.lead_labor_id || null,
          job_id: jobId,
          date: timesheetData.date,
          start_time: timesheetData.start_time || null,
          end_time: timesheetData.end_time || null,
          work_activity: timesheetData.work_activity || null,
          pause_timer: timesheetData.pause_timer || [],
          job_status: timesheetData.job_status || 'in_progress',
          status: timesheetData.status || 'draft'
        };

        if (existingEntry) {
          // Update existing entry
          await LaborTimesheet.update(existingEntry.id, timesheetEntryData);
        } else {
          // Create new entry
          await LaborTimesheet.create(timesheetEntryData);
        }
      }

      if (updateData.lead_labor_timesheet) {
        const timesheetData = updateData.lead_labor_timesheet;

        if (!timesheetData.lead_labor_id || !timesheetData.user_id || !timesheetData.date) {
          throw new Error('lead_labor_id, user_id, and date are required for lead labor timesheet');
        }

        const currentLeadTimesheets = safeJsonParse(job.lead_labor_timesheets, []);

        const existingIndex = currentLeadTimesheets.findIndex(
          ts => ts.lead_labor_id === timesheetData.lead_labor_id && ts.date === timesheetData.date
        );

        const timesheetEntry = {
          lead_labor_id: timesheetData.lead_labor_id,
          user_id: timesheetData.user_id,
          labor_name: timesheetData.labor_name || 'Unknown Lead Labor',
          date: timesheetData.date,
          start_time: timesheetData.start_time || null,
          end_time: timesheetData.end_time || null,
          total_hours: timesheetData.total_hours || "00:00:00",
          break_duration: timesheetData.break_duration || "00:00:00",
          work_hours: timesheetData.work_hours || "00:00:00",
          hourly_rate: timesheetData.hourly_rate || 0,
          total_cost: timesheetData.total_cost || 0,
          work_activity: timesheetData.work_activity || null,
          status: timesheetData.status || 'active',
          notes: timesheetData.notes || '',
          created_at: timesheetData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          currentLeadTimesheets[existingIndex] = timesheetEntry;
        } else {
          currentLeadTimesheets.push(timesheetEntry);
        }

        updateFields.lead_labor_timesheets = JSON.stringify(currentLeadTimesheets);
      }

      if (updateFields.labor_timesheets) {
        console.log(`Labor timesheets to save:`, updateFields.labor_timesheets);
      }

      const { data, error } = await supabase
        .from("jobs")
        .update(updateFields)
        .eq("id", jobId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }



      const parsedData = { ...data };
      parsedData.labor_timesheets = safeJsonParse(data.labor_timesheets, []);
      parsedData.lead_labor_timesheets = safeJsonParse(data.lead_labor_timesheets, []);
      parsedData.pause_timer = safeJsonParse(data.pause_timer, []);


      const { data: freshData, error: freshError } = await supabase
        .from("jobs")
        .select("labor_timesheets, lead_labor_timesheets, pause_timer")
        .eq("id", jobId)
        .single();

      if (!freshError && freshData) {
        if (freshData.labor_timesheets) {
          const freshParsed = safeJsonParse(freshData.labor_timesheets, []);
        }
      }

      return parsedData;
    } catch (error) {
      throw error;
    }
  }

  static calculateTimeDifference(startTime, endTime) {
    if (!startTime || !endTime) return "00:00:00";

    const start = new Date(`1970-01-01T${startTime}Z`);
    const end = new Date(`1970-01-01T${endTime}Z`);
    const diffMs = end - start;

    if (diffMs < 0) return "00:00:00";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  static timeToHours(timeString) {
    if (!timeString || timeString === "00:00:00") return 0;

    try {
      // Handle different time string formats
      if (typeof timeString !== 'string') {
        console.warn('Invalid time format - not a string:', timeString);
        return 0;
      }

      // Check if it's a valid time format (HH:MM:SS or HH:MM)
      const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
      if (!timeRegex.test(timeString)) {
        console.warn('Invalid time format:', timeString);
        return 0;
      }

      const parts = timeString.split(':');
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2] || '0', 10) || 0;

      // Validate ranges
      if (minutes >= 60 || seconds >= 60) {
        console.warn('Invalid time values:', timeString);
        return 0;
      }

      return hours + (minutes / 60) + (seconds / 3600);
    } catch (error) {
      console.warn('Error parsing time string:', timeString, error.message);
      return 0;
    }
  }

  static formatLocalDate(dateInput) {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatTimeDisplay(totalHours) {
    if (totalHours === 0) return "0h";

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    if (hours === 0 && minutes > 0) {
      return `${minutes}m`;
    } else if (hours > 0 && minutes === 0) {
      return `${hours}h`;
    } else if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return "0h";
    }
  }

  static hoursToTime(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  static async getWeeklyTimesheetSummary(jobId, startDate, endDate) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }



      let allTimesheets = [];
      let laborTimesheets = [];
      let leadLaborTimesheets = [];

      if (typeof job.labor_timesheets === 'string') {
        allTimesheets = safeJsonParse(job.labor_timesheets, []);
      } else if (Array.isArray(job.labor_timesheets)) {
        allTimesheets = job.labor_timesheets;
      }

      laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);



      const filteredLaborTimesheets = laborTimesheets.filter(ts => {
        const tsDateStr = ts.date;

        return tsDateStr >= startDate && tsDateStr <= endDate;
      });

      const filteredLeadLaborTimesheets = leadLaborTimesheets.filter(ts => {
        const tsDateStr = ts.date;

        return tsDateStr >= startDate && tsDateStr <= endDate;
      });




      const weeklyBreakdown = {};
      const laborSummary = {};
      const leadLaborSummary = {};


      let allFilteredTimesheets = [...filteredLaborTimesheets, ...filteredLeadLaborTimesheets];



      allFilteredTimesheets.forEach(timesheet => {
        const date = timesheet.date;

        if (!weeklyBreakdown[date]) {
          weeklyBreakdown[date] = { labor: [], lead_labor: [] };
        }


        if (timesheet.labor_id) {

          const laborId = timesheet.labor_id;

          weeklyBreakdown[date].labor.push({
            labor_id: timesheet.labor_id,
            labor_name: timesheet.labor_name,
            start_time: timesheet.start_time,
            end_time: timesheet.end_time,
            total_hours: timesheet.total_hours,
            work_hours: timesheet.work_hours,
            break_duration: timesheet.break_duration,
            hourly_rate: timesheet.hourly_rate,
            total_cost: timesheet.total_cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status,
            notes: timesheet.notes,
            pause_timer: timesheet.pause_timer,
            job_status: timesheet.job_status
          });


          if (!laborSummary[laborId]) {
            laborSummary[laborId] = {
              labor_id: laborId,
              labor_name: timesheet.labor_name,
              total_hours: 0,
              total_cost: 0,
              days_worked: 0,
              daily_breakdown: {}
            };
          }

          const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
          const cost = parseFloat(timesheet.total_cost) || 0;

          laborSummary[laborId].total_hours += hours;
          laborSummary[laborId].total_cost += cost;
          laborSummary[laborId].days_worked += 1;
          laborSummary[laborId].daily_breakdown[date] = {
            hours: timesheet.work_hours || timesheet.total_hours,
            cost: cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status || 'active',
            billable: timesheet.billable !== undefined ? timesheet.billable : null
          };
        } else if (timesheet.lead_labor_id) {

          const leadLaborId = timesheet.lead_labor_id;

          weeklyBreakdown[date].lead_labor.push({
            lead_labor_id: timesheet.lead_labor_id,
            labor_name: timesheet.labor_name,
            start_time: timesheet.start_time,
            end_time: timesheet.end_time,
            total_hours: timesheet.total_hours,
            work_hours: timesheet.work_hours,
            break_duration: timesheet.break_duration,
            hourly_rate: timesheet.hourly_rate,
            total_cost: timesheet.total_cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status,
            job_status: timesheet.job_status,
            notes: timesheet.notes,
            pause_timer: timesheet.pause_timer
          });


          if (!leadLaborSummary[leadLaborId]) {
            leadLaborSummary[leadLaborId] = {
              lead_labor_id: leadLaborId,
              labor_name: timesheet.labor_name,
              total_hours: 0,
              total_cost: 0,
              days_worked: 0,
              daily_breakdown: {}
            };
          }

          const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
          const cost = parseFloat(timesheet.total_cost) || 0;

          leadLaborSummary[leadLaborId].total_hours += hours;
          leadLaborSummary[leadLaborId].total_cost += cost;
          leadLaborSummary[leadLaborId].days_worked += 1;
          leadLaborSummary[leadLaborId].daily_breakdown[date] = {
            hours: timesheet.work_hours || timesheet.total_hours,
            cost: cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status || 'active',
            billable: timesheet.billable !== undefined ? timesheet.billable : null
          };
        }
      });



      const totalLaborHours = Object.values(laborSummary).reduce((sum, labor) => sum + labor.total_hours, 0);
      const totalLaborCost = Object.values(laborSummary).reduce((sum, labor) => sum + labor.total_cost, 0);
      const totalLeadLaborHours = Object.values(leadLaborSummary).reduce((sum, labor) => sum + labor.total_hours, 0);
      const totalLeadLaborCost = Object.values(leadLaborSummary).reduce((sum, labor) => sum + labor.total_cost, 0);




      const dashboardFormat = [];


      const allLaborTimesheets = safeJsonParse(job.labor_timesheets, []);
      const allLeadLaborTimesheets = allLaborTimesheets.filter(ts => ts.lead_labor_id);



      if (Object.keys(laborSummary).length === 0 && Object.keys(leadLaborSummary).length === 0) {



        if (allLaborTimesheets.length > 0 || allLeadLaborTimesheets.length > 0) {

          allLaborTimesheets.forEach(timesheet => {
            const laborId = timesheet.labor_id;
            if (!laborSummary[laborId]) {
              laborSummary[laborId] = {
                labor_id: laborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }

            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;

            laborSummary[laborId].total_hours += hours;
            laborSummary[laborId].total_cost += cost;
            laborSummary[laborId].days_worked += 1;
            laborSummary[laborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          });


          allLeadLaborTimesheets.forEach(timesheet => {
            const leadLaborId = timesheet.lead_labor_id;
            if (!leadLaborSummary[leadLaborId]) {
              leadLaborSummary[leadLaborId] = {
                lead_labor_id: leadLaborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }

            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;

            leadLaborSummary[leadLaborId].total_hours += hours;
            leadLaborSummary[leadLaborId].total_cost += cost;
            leadLaborSummary[leadLaborId].days_worked += 1;
            leadLaborSummary[leadLaborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          });


        } else {
          console.log('DEBUG - No timesheet data found at all in job');
        }
      }

      const jobInfo = {
        job_title: job.job_title,
        job_id: jobId
      };

      Object.values(laborSummary).forEach(labor => {
        const employeeHours = {};
        let totalHours = 0;
        let billableHours = 0;
        let weekDays = [];

        const start = new Date(startDate);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          weekDays.push(Job.formatLocalDate(day));
        }

        let laborStatus = "Draft";
        const statusCounts = {};


        weekDays.forEach((dayDate, index) => {
          const actualDay = new Date(dayDate);
          const dayOfWeek = actualDay.getDay();


          const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayNameIndex];

          const dailyData = labor.daily_breakdown[dayDate];

          if (dailyData) {
            const hoursValue = Job.timeToHours(dailyData.hours || '00:00:00');
            employeeHours[dayName.toLowerCase()] = Job.formatTimeDisplay(hoursValue);
            totalHours += hoursValue;
            billableHours += hoursValue;


            if (dailyData.status) {
              const normalizedStatus = dailyData.status.toLowerCase();
              statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
            }
          } else {
            employeeHours[dayName.toLowerCase()] = '0h';
          }
        });

        const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        if (totalDays > 0) {
          if (statusCounts.approved > 0) {
            laborStatus = "Approved";

          } else if (statusCounts.submitted > 0) {
            laborStatus = "Submitted";
          } else if (statusCounts.active > 0) {
            laborStatus = "Active";
          } else if (statusCounts.pending > 0) {
            laborStatus = "Pending";
          }
          if (statusCounts.rejected > 0) {
            laborStatus = "Rejected";
          }
        } else if (totalHours > 0) {
          laborStatus = "Active";
        }


        dashboardFormat.push({
          employee: labor.labor_name,
          job: `${jobInfo.job_title} (Job-${jobId})`,
          week: `${startDate} - ${endDate}`,
          ...employeeHours,
          total: Job.formatTimeDisplay(totalHours),
          billable: Job.formatTimeDisplay(billableHours),
          status: laborStatus,
          actions: ["approve", "reject"]
        });
      });


      Object.values(leadLaborSummary).forEach(labor => {
        const employeeHours = {};
        let totalHours = 0;
        let billableHours = 0;
        let weekDays = [];


        const start = new Date(startDate);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          weekDays.push(Job.formatLocalDate(day));
        }

        let leadStatus = "Draft";
        const statusCounts = {};

        weekDays.forEach((dayDate, index) => {
          const actualDay = new Date(dayDate);
          const dayOfWeek = actualDay.getDay();


          const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayNameIndex];

          const dailyData = labor.daily_breakdown[dayDate];

          if (dailyData) {
            const hoursValue = Job.timeToHours(dailyData.hours || '00:00:00');
            employeeHours[dayName.toLowerCase()] = Job.formatTimeDisplay(hoursValue);
            totalHours += hoursValue;
            billableHours += hoursValue;


            if (dailyData.status) {
              const normalizedStatus = dailyData.status.toLowerCase();
              statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
            }
          } else {
            employeeHours[dayName.toLowerCase()] = '0h';
          }
        });

        const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        if (totalDays > 0) {
          if (statusCounts.approved > 0) {
            leadStatus = "Approved";
          } else if (statusCounts.submitted > 0) {
            leadStatus = "Submitted";
          } else if (statusCounts.active > 0) {
            leadStatus = "Active";
          } else if (statusCounts.pending > 0) {
            leadStatus = "Pending";
          }
          if (statusCounts.rejected > 0) {
            leadStatus = "Rejected";
          }
        } else if (totalHours > 0) {
          leadStatus = "Active";
        }


        dashboardFormat.push({
          employee: labor.labor_name,
          job: `${jobInfo.job_title} (Job-${jobId})`,
          week: `${startDate} - ${endDate}`,
          ...employeeHours,
          total: Job.formatTimeDisplay(totalHours),
          billable: Job.formatTimeDisplay(billableHours),
          status: leadStatus,
          actions: ["approve", "reject"]
        });
      });

      return {
        job_id: jobId,
        period: {
          start_date: startDate,
          end_date: endDate,
          week_range: `${startDate} - ${endDate}`
        },
        dashboard_timesheets: dashboardFormat
      };
    } catch (error) {
      throw error;
    }
  }

  static async approveTimesheet(jobId, laborId, date, status = 'approved', billable = null) {
    try {
      if (!jobId || !laborId || !date) {
        throw new Error('jobId, laborId, and date are required for timesheet approval');
      }


      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }


      const allTimesheets = safeJsonParse(job.labor_timesheets, []);
      const laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      const leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);

      let timesheetUpdated = false;


      for (let i = 0; i < laborTimesheets.length; i++) {
        if (((laborTimesheets[i].labor_id && parseInt(laborTimesheets[i].labor_id) === parseInt(laborId)) ||
          (laborTimesheets[i].lead_labor_id && parseInt(laborTimesheets[i].lead_labor_id) === parseInt(laborId))) &&
          laborTimesheets[i].date === date) {
          laborTimesheets[i].status = status;
          laborTimesheets[i].updated_at = new Date().toISOString();


          if (billable !== null && billable !== undefined) {

            if (typeof billable === 'number') {
              laborTimesheets[i].billable = billable;
            } else if (typeof billable === 'string') {

              const cleanBillable = billable.replace(/[h]/gi, '').trim();
              if (cleanBillable.includes(':')) {

                const [hours, minutes] = cleanBillable.split(':');
                laborTimesheets[i].billable = parseFloat(hours) + (parseFloat(minutes || 0) / 60);
              } else {

                laborTimesheets[i].billable = parseFloat(cleanBillable) || billable;
              }
            } else {
              laborTimesheets[i].billable = billable;
            }
          }

          timesheetUpdated = true;

          const allTimesheetIndex = allTimesheets.findIndex(ts =>
            ((ts.labor_id && parseInt(ts.labor_id) === parseInt(laborId)) ||
              (ts.lead_labor_id && parseInt(ts.lead_labor_id) === parseInt(laborId))) && ts.date === date
          );
          if (allTimesheetIndex >= 0) {
            allTimesheets[allTimesheetIndex] = laborTimesheets[i];
          }
        }
      }


      for (let i = 0; i < leadLaborTimesheets.length; i++) {
        if (((leadLaborTimesheets[i].labor_id && parseInt(leadLaborTimesheets[i].labor_id) === parseInt(laborId)) ||
          (leadLaborTimesheets[i].lead_labor_id && parseInt(leadLaborTimesheets[i].lead_labor_id) === parseInt(laborId))) &&
          leadLaborTimesheets[i].date === date) {
          leadLaborTimesheets[i].status = status;
          leadLaborTimesheets[i].updated_at = new Date().toISOString();


          if (billable !== null && billable !== undefined) {

            if (typeof billable === 'number') {
              leadLaborTimesheets[i].billable = billable;
            } else if (typeof billable === 'string') {

              const cleanBillable = billable.replace(/[h]/gi, '').trim();
              if (cleanBillable.includes(':')) {

                const [hours, minutes] = cleanBillable.split(':');
                leadLaborTimesheets[i].billable = parseFloat(hours) + (parseFloat(minutes || 0) / 60);
              } else {

                leadLaborTimesheets[i].billable = parseFloat(cleanBillable) || billable;
              }
            } else {
              leadLaborTimesheets[i].billable = billable;
            }
          }

          timesheetUpdated = true;

          const allTimesheetIndex = allTimesheets.findIndex(ts =>
            ((ts.labor_id && parseInt(ts.labor_id) === parseInt(laborId)) ||
              (ts.lead_labor_id && parseInt(ts.lead_labor_id) === parseInt(laborId))) && ts.date === date
          );
          if (allTimesheetIndex >= 0) {
            allTimesheets[allTimesheetIndex] = leadLaborTimesheets[i];
          }
        }
      }

      if (!timesheetUpdated) {
        throw new Error('Timesheet entry not found for the given labor_id and date');
      }


      const { data, error: updateError } = await supabase
        .from("jobs")
        .update({
          labor_timesheets: JSON.stringify(allTimesheets),
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        message: `Timesheet ${status} successfully`,
        data: {
          job_id: jobId,
          labor_id: laborId,
          date: date,
          status: status,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }


  static async approveWeekTimesheet(jobId, laborOrLeadLaborId, startDate, endDate, status = 'approved') {
    try {
      if (!jobId || !laborOrLeadLaborId || !startDate || !endDate) {
        throw new Error('jobId, laborId/lead_labor_id, startDate, and endDate are required for weekly timesheet approval');
      }

      // Get timesheets from new table for the specific job, labor, and date range
      const { data: timesheets, error: fetchError } = await supabase
        .from('labor_timesheets')
        .select('*')
        .eq('job_id', jobId)
        .or(`labor_id.eq.${laborOrLeadLaborId},lead_labor_id.eq.${laborOrLeadLaborId}`)
        .gte('date', startDate)
        .lte('date', endDate);

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!timesheets || timesheets.length === 0) {
        throw new Error('No timesheet entries found for the given labor/lead_labor and date range');
      }

      // Update each timesheet entry with new status
      // Only update 'status' field, not 'job_status'
      const updatePromises = timesheets.map(timesheet =>
        LaborTimesheet.update(timesheet.id, {
          status: status
        })
      );

      await Promise.all(updatePromises);

      return {
        success: true,
        message: `${timesheets.length} timesheet entries ${status} successfully for the week`,
        data: {
          job_id: jobId,
          labor_or_lead_labor_id: laborOrLeadLaborId,
          start_date: startDate,
          end_date: endDate,
          status: status,
          entries_updated: timesheets.length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllJobsWeeklyTimesheetSummary(startDate, endDate, pagination = {}) {
    try {
      // If no date range provided, show current month's latest week with timesheet data
      // If date range provided, filter by that range
      let actualStartDate = startDate;
      let actualEndDate = endDate;

      if (!startDate || !endDate) {
        // Find the most recent timesheet date from new table
        const { data: latestTimesheet, error: latestError } = await supabase
          .from('labor_timesheets')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (latestError && latestError.code !== 'PGRST116') {
          throw new Error(`Database error: ${latestError.message}`);
        }

        if (latestTimesheet && latestTimesheet.date) {
          // Calculate the week containing the latest date
          const latestDateObj = new Date(latestTimesheet.date);
          const dayOfWeek = latestDateObj.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0

          const mondayOfWeek = new Date(latestDateObj);
          mondayOfWeek.setDate(latestDateObj.getDate() + daysToMonday);

          const sundayOfWeek = new Date(mondayOfWeek);
          sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);

          actualStartDate = Job.formatLocalDate(mondayOfWeek);
          actualEndDate = Job.formatLocalDate(sundayOfWeek);
        } else {
          // If no timesheet data found, use current week
          const today = new Date();
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

          const mondayOfWeek = new Date(today);
          mondayOfWeek.setDate(today.getDate() + daysToMonday);

          const sundayOfWeek = new Date(mondayOfWeek);
          sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);

          actualStartDate = Job.formatLocalDate(mondayOfWeek);
          actualEndDate = Job.formatLocalDate(sundayOfWeek);
        }
      }

      // Get all timesheets from new table for the date range
      const { data: allTimesheets, error: timesheetsError } = await supabase
        .from('labor_timesheets')
        .select(`
          *,
          job:job_id (
            id,
            job_title
          ),
          labor:labor_id (
            id,
            users!labor_user_id_fkey (
              full_name
            )
          ),
          lead_labor:lead_labor_id (
            id,
            users!lead_labor_user_id_fkey (
              full_name
            )
          )
        `)
        .gte('date', actualStartDate)
        .lte('date', actualEndDate)
        .order('date', { ascending: false });

      if (timesheetsError) {
        throw new Error(`Database error: ${timesheetsError.message}`);
      }

      const allDashboardTimesheets = [];

      // Group timesheets by job
      const timesheetsByJob = {};
      (allTimesheets || []).forEach(ts => {
        const jobId = ts.job_id;
        if (!timesheetsByJob[jobId]) {
          timesheetsByJob[jobId] = {
            job_id: jobId,
            job_title: ts.job?.job_title || 'Unknown Job',
            timesheets: []
          };
        }
        timesheetsByJob[jobId].timesheets.push(ts);
      });

      for (const jobId in timesheetsByJob) {
        const job = timesheetsByJob[jobId];
        const allTimesheetsForJob = job.timesheets;

        const filteredLaborTimesheets = allTimesheetsForJob.filter(ts => ts.labor_id);
        const filteredLeadLaborTimesheets = allTimesheetsForJob.filter(ts => ts.lead_labor_id);

        const laborSummary = {};
        const leadLaborSummary = {};

        [...filteredLaborTimesheets, ...filteredLeadLaborTimesheets].forEach(timesheet => {

          if (timesheet.labor_id) {
            const laborId = timesheet.labor_id;
            if (!laborSummary[laborId]) {
              laborSummary[laborId] = {
                labor_id: laborId,
                labor_name: timesheet.labor?.users?.full_name || 'Unknown',
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }

            // Calculate hours from start_time and end_time
            let hours = 0;
            let timeValue = "00:00:00";
            if (timesheet.start_time && timesheet.end_time) {
              const start = new Date(`2000-01-01T${timesheet.start_time}`);
              const end = new Date(`2000-01-01T${timesheet.end_time}`);
              const diffMs = end - start;
              hours = diffMs / (1000 * 60 * 60); // Convert to hours

              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
              timeValue = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
            }

            const cost = 0; // Cost calculation would need hourly_rate from labor table

            laborSummary[laborId].total_hours += hours;
            laborSummary[laborId].total_cost += cost;
            laborSummary[laborId].days_worked += 1;
            laborSummary[laborId].daily_breakdown[timesheet.date] = {
              hours: timeValue,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || timesheet.job_status || 'pending',
              billable: null // Not available in new structure
            };
          } else if (timesheet.lead_labor_id) {
            const leadLaborId = timesheet.lead_labor_id;
            if (!leadLaborSummary[leadLaborId]) {
              leadLaborSummary[leadLaborId] = {
                lead_labor_id: leadLaborId,
                labor_name: timesheet.lead_labor?.users?.full_name || 'Unknown',
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }

            // Calculate hours from start_time and end_time
            let hours = 0;
            let timeValue = "00:00:00";
            if (timesheet.start_time && timesheet.end_time) {
              const start = new Date(`2000-01-01T${timesheet.start_time}`);
              const end = new Date(`2000-01-01T${timesheet.end_time}`);
              const diffMs = end - start;
              hours = diffMs / (1000 * 60 * 60); // Convert to hours

              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
              timeValue = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
            }

            const cost = 0; // Cost calculation would need hourly_rate from lead_labor table

            leadLaborSummary[leadLaborId].total_hours += hours;
            leadLaborSummary[leadLaborId].total_cost += cost;
            leadLaborSummary[leadLaborId].days_worked += 1;
            leadLaborSummary[leadLaborId].daily_breakdown[timesheet.date] = {
              hours: timeValue,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || timesheet.job_status || 'pending',
              billable: null // Not available in new structure
            };
          }
        });

        Object.values(laborSummary).forEach(labor => {
          const employeeHours = {};
          let totalHours = 0;
          let billableHours = 0;
          let weekDays = [];

          let laborStatus = "Draft";
          const statusCounts = {};

          // Use calculated date range for weekly view
          const start = new Date(actualStartDate);
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

          for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            weekDays.push(day.toISOString().split('T')[0]);
          }

          weekDays.forEach((dayDate) => {
            const actualDay = new Date(dayDate);
            const dayOfWeek = actualDay.getDay();
            const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const dayName = dayNames[dayNameIndex];

            const dailyData = labor.daily_breakdown[dayDate];

            if (dailyData) {
              const timeValue = dailyData.hours || "00:00:00";
              const hoursValue = Job.timeToHours(timeValue);
              employeeHours[dayName.toLowerCase()] = Job.formatTimeDisplay(hoursValue);
              totalHours += hoursValue;

              const rawStatus = dailyData.status || 'pending';
              const currentStatus = rawStatus.toLowerCase();
              if (statusCounts[currentStatus]) {
                statusCounts[currentStatus]++;
              } else {
                statusCounts[currentStatus] = 1;
              }

              if (dailyData.billable !== null && dailyData.billable !== undefined) {
                billableHours += parseFloat(dailyData.billable) || 0;
              } else {
                billableHours += hoursValue;
              }
            } else {
              employeeHours[dayName.toLowerCase()] = '0h';
            }
          });

          const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
          if (totalDays > 0) {
            if (statusCounts.approved > 0) {
              laborStatus = "Approved";
              console.log(`DEBUG - Setting status to Approved (lowercase check)`);
            } else if (statusCounts.submitted > 0) {
              laborStatus = "Submitted";
            } else if (statusCounts.active > 0) {
              laborStatus = "Active";
            } else if (statusCounts.pending > 0) {
              laborStatus = "Pending";
            }
            if (statusCounts.rejected > 0) {
              laborStatus = "Rejected";
            }
          } else if (totalHours > 0) {
            laborStatus = "Active";
          }


          allDashboardTimesheets.push({
            employee: labor.labor_name,
            job: `${job.job_title} (Job-${job.job_id})`,
            job_id: job.job_id,
            labor_id: labor.labor_id,
            lead_labor_id: null,
            week: `${actualStartDate} - ${actualEndDate}`,
            ...employeeHours,
            total: Job.formatTimeDisplay(totalHours),
            billable: Job.formatTimeDisplay(billableHours),
            status: laborStatus,
            actions: ["approve", "reject"]
          });
        });

        Object.values(leadLaborSummary).forEach(labor => {
          const employeeHours = {};
          let totalHours = 0;
          let billableHours = 0;
          let weekDays = [];

          let laborStatus = "Draft";
          const statusCounts = {};

          // Use calculated date range for weekly view
          const start = new Date(actualStartDate);
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

          for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            weekDays.push(day.toISOString().split('T')[0]);
          }

          weekDays.forEach((dayDate) => {
            const actualDay = new Date(dayDate);
            const dayOfWeek = actualDay.getDay();
            const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const dayName = dayNames[dayNameIndex];

            const dailyData = labor.daily_breakdown[dayDate];

            if (dailyData) {
              const timeValue = dailyData.hours || "00:00:00";
              const hoursValue = Job.timeToHours(timeValue);
              employeeHours[dayName.toLowerCase()] = Job.formatTimeDisplay(hoursValue);
              totalHours += hoursValue;

              const rawStatus = dailyData.status || 'pending';
              const currentStatus = rawStatus.toLowerCase();
              if (statusCounts[currentStatus]) {
                statusCounts[currentStatus]++;
              } else {
                statusCounts[currentStatus] = 1;
              }

              if (dailyData.billable !== null && dailyData.billable !== undefined) {
                billableHours += parseFloat(dailyData.billable) || 0;
              } else {
                billableHours += hoursValue;
              }
            } else {
              employeeHours[dayName.toLowerCase()] = '0h';
            }
          });

          const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
          if (totalDays > 0) {
            if (statusCounts.approved > 0) {
              laborStatus = "Approved";
            } else if (statusCounts.submitted > 0) {
              laborStatus = "Submitted";
            } else if (statusCounts.active > 0) {
              laborStatus = "Active";
            } else if (statusCounts.pending > 0) {
              laborStatus = "Pending";
            }
            if (statusCounts.rejected > 0) {
              laborStatus = "Rejected";
            }
          } else if (totalHours > 0) {
            laborStatus = "Active";
          }


          allDashboardTimesheets.push({
            employee: labor.labor_name,
            job: `${job.job_title} (Job-${job.job_id})`,
            job_id: job.job_id,
            labor_id: null,
            lead_labor_id: labor.lead_labor_id,
            week: `${actualStartDate} - ${actualEndDate}`,
            ...employeeHours,
            total: Job.formatTimeDisplay(totalHours),
            billable: Job.formatTimeDisplay(billableHours),
            status: laborStatus,
            actions: ["approve", "reject"]
          });
        });
      }

      // Apply pagination
      const { page = 1, limit = 10, offset = 0 } = pagination;
      const totalRecords = allDashboardTimesheets.length;
      const totalPages = Math.ceil(totalRecords / limit);

      const paginatedData = allDashboardTimesheets.slice(offset, offset + limit);

      return {
        period: {
          start_date: actualStartDate,
          end_date: actualEndDate,
          week_range: `${actualStartDate} - ${actualEndDate}`
        },
        dashboard_timesheets: paginatedData,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTimesheetSummary(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Get timesheets from new table
      const allTimesheets = await LaborTimesheet.findByJobId(jobId);
      const laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      const leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);

      let totalLaborHours = 0;
      let totalLaborCost = 0;
      const laborSummary = {};

      laborTimesheets.forEach(timesheet => {
        // Calculate hours from start_time and end_time
        let hours = 0;
        if (timesheet.start_time && timesheet.end_time) {
          const start = new Date(`2000-01-01T${timesheet.start_time}`);
          const end = new Date(`2000-01-01T${timesheet.end_time}`);
          const diffMs = end - start;
          hours = diffMs / (1000 * 60 * 60); // Convert to hours
        }

        const cost = 0; // Cost calculation would need hourly_rate from labor table

        totalLaborHours += hours;
        totalLaborCost += cost;

        if (!laborSummary[timesheet.labor_id]) {
          laborSummary[timesheet.labor_id] = {
            labor_id: timesheet.labor_id,
            labor_name: timesheet.labor?.users?.full_name || 'Unknown',
            total_hours: 0,
            total_cost: 0,
            days_worked: 0
          };
        }

        laborSummary[timesheet.labor_id].total_hours += hours;
        laborSummary[timesheet.labor_id].total_cost += cost;
        laborSummary[timesheet.labor_id].days_worked += 1;
      });

      let totalLeadLaborHours = 0;
      let totalLeadLaborCost = 0;
      const leadLaborSummary = {};

      leadLaborTimesheets.forEach(timesheet => {
        // Calculate hours from start_time and end_time
        let hours = 0;
        if (timesheet.start_time && timesheet.end_time) {
          const start = new Date(`2000-01-01T${timesheet.start_time}`);
          const end = new Date(`2000-01-01T${timesheet.end_time}`);
          const diffMs = end - start;
          hours = diffMs / (1000 * 60 * 60); // Convert to hours
        }

        const cost = 0; // Cost calculation would need hourly_rate from lead_labor table

        totalLeadLaborHours += hours;
        totalLeadLaborCost += cost;

        if (!leadLaborSummary[timesheet.lead_labor_id]) {
          leadLaborSummary[timesheet.lead_labor_id] = {
            lead_labor_id: timesheet.lead_labor_id,
            labor_name: timesheet.lead_labor?.users?.full_name || 'Unknown',
            total_hours: 0,
            total_cost: 0,
            days_worked: 0
          };
        }

        leadLaborSummary[timesheet.lead_labor_id].total_hours += hours;
        leadLaborSummary[timesheet.lead_labor_id].total_cost += cost;
        leadLaborSummary[timesheet.lead_labor_id].days_worked += 1;
      });

      return {
        job_id: jobId,
        summary: {
          total_labor_hours: Job.hoursToTime(totalLaborHours),
          total_lead_labor_hours: Job.hoursToTime(totalLeadLaborHours),
          total_hours: Job.hoursToTime(totalLaborHours + totalLeadLaborHours),
          total_labor_cost: totalLaborCost.toFixed(2),
          total_lead_labor_cost: totalLeadLaborCost.toFixed(2),
          total_cost: (totalLaborCost + totalLeadLaborCost).toFixed(2)
        },
        labor_breakdown: Object.values(laborSummary).map(labor => ({
          ...labor,
          total_hours: Job.hoursToTime(labor.total_hours),
          total_cost: labor.total_cost.toFixed(2)
        })),
        lead_labor_breakdown: Object.values(leadLaborSummary).map(labor => ({
          ...labor,
          total_hours: Job.hoursToTime(labor.total_hours),
          total_cost: labor.total_cost.toFixed(2)
        })),
        all_timesheets: {
          labor: laborTimesheets,
          lead_labor: leadLaborTimesheets
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProjectSummary(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      let materialsCost = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        materialsCost = job.assigned_materials.reduce((total, material) => {
          const quantity = material.stock_quantity || 0;
          const unitCost = parseFloat(material.unit_cost) || 0;
          return total + (quantity * unitCost);
        }, 0);
      }

      let laborCost = 0;
      if (job.assigned_labor && job.assigned_labor.length > 0) {
        laborCost = job.assigned_labor.reduce((total, labor) => {
          const hourlyRate = parseFloat(labor.hourly_rate) || 0;
          const hoursWorked = parseFloat(labor.hours_worked) || 0;
          return total + (hourlyRate * hoursWorked);
        }, 0);
      }

      if (job.custom_labor && job.custom_labor.length > 0) {
        const customLaborCost = job.custom_labor.reduce((total, labor) => {
          const hourlyRate = parseFloat(labor.hourly_rate) || 0;
          const hoursWorked = parseFloat(labor.hours_worked) || 0;
          return total + (hourlyRate * hoursWorked);
        }, 0);
        laborCost += customLaborCost;
      }

      const actualProjectCost = materialsCost + laborCost;


      const jobEstimate = parseFloat(job.estimated_cost) || 0;

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        projectSummary: {
          jobEstimate: jobEstimate,
          materialsCost: materialsCost,
          laborCost: laborCost,
          actualProjectCost: actualProjectCost
        },
        costBreakdown: {
          materials: {
            totalCost: materialsCost,
            items: job.assigned_materials || [],
            count: job.assigned_materials ? job.assigned_materials.length : 0
          },
          labor: {
            totalCost: laborCost,
            regularLabor: job.assigned_labor || [],
            customLabor: job.custom_labor || [],
            totalWorkers: (job.assigned_labor ? job.assigned_labor.length : 0) + (job.custom_labor ? job.custom_labor.length : 0)
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        }
      };
    } catch (error) {
      throw error;
    }
  }


  static async getJobDashboard(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Run job fetch, bluesheets fetch, and estimates count in parallel for better performance
      const [jobResult, bluesheetsResult, estimatesResult] = await Promise.allSettled([
        Job.findById(jobId),
        supabase
          .from('job_bluesheet')
          .select(
            `id,
             job_id,
             status,
             labor_entries:job_bluesheet_labor (
               id,
               regular_hours
             )`
          )
          .eq('job_id', jobId)
          .eq('status', 'approved'),
        supabase
          .from('estimates')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', jobId)
      ]);

      // Extract results
      const job = jobResult.status === 'fulfilled' ? jobResult.value : null;
      if (!job) {
        throw new Error('Job not found');
      }

      const bluesheets = bluesheetsResult.status === 'fulfilled' && !bluesheetsResult.value.error
        ? bluesheetsResult.value.data || []
        : [];

      const numberOfInvoices = estimatesResult.status === 'fulfilled' && !estimatesResult.value.error
        ? (estimatesResult.value.count || 0)
        : 0;

      // Calculate totalHoursWorked from bluesheet labor regular_hours
      const parseHours = (hoursString) => {
        if (!hoursString) return 0;
        
        // Handle string format
        if (typeof hoursString === 'string') {
          // Format: HH:MM:SS (e.g., "05:00:00", "00:01:12")
          const timeMatch = hoursString.match(/^(\d+):(\d+):(\d+)$/);
          if (timeMatch) {
            const h = parseInt(timeMatch[1]) || 0;
            const m = parseInt(timeMatch[2]) || 0;
            const s = parseInt(timeMatch[3]) || 0;
            return h + (m / 60) + (s / 3600);
          }
          
          // Format: HH:MM (e.g., "8:30")
          const timeMatchShort = hoursString.match(/^(\d+):(\d+)$/);
          if (timeMatchShort) {
            const h = parseInt(timeMatchShort[1]) || 0;
            const m = parseInt(timeMatchShort[2]) || 0;
            return h + (m / 60);
          }
          
          // Format: "8h", "8h30m"
          const hMatch = hoursString.match(/(\d+(?:\.\d+)?)h(?:\d+m)?/);
          if (hMatch) return parseFloat(hMatch[1]);
          
          // Plain number fallback
          const num = parseFloat(hoursString);
          return isNaN(num) ? 0 : num;
        }
        
        // If it's already a number
        if (typeof hoursString === 'number') {
          return isNaN(hoursString) ? 0 : hoursString;
        }
        
        return 0;
      };

      let totalHoursWorked = 0;
      try {
        totalHoursWorked = bluesheets.reduce((sum, bs) => {
          const entries = bs.labor_entries || [];
          const hoursForSheet = entries.reduce((eSum, e) => eSum + parseHours(e.regular_hours), 0);
          return sum + hoursForSheet;
        }, 0);
      } catch (calcErr) {
        console.error('Error calculating totalHoursWorked from bluesheets:', calcErr.message);
      }

      // Calculate totalMaterialUsed
      let totalMaterialUsed = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        totalMaterialUsed = job.assigned_materials.length;
      }

      // Calculate totalLabourEntries
      let totalLabourEntries = 0;
      // Only count if arrays exist and have elements
      if (Array.isArray(job.assigned_lead_labor) && job.assigned_lead_labor.length > 0) {
        totalLabourEntries += job.assigned_lead_labor.length;
      }
      if (Array.isArray(job.assigned_labor) && job.assigned_labor.length > 0) {
        totalLabourEntries += job.assigned_labor.length;
      }
      if (Array.isArray(job.custom_labor) && job.custom_labor.length > 0) {
        totalLabourEntries += job.custom_labor.length;
      }

      // Convert decimal hours to "XhYm" format (e.g., 4.82 -> "4h49m")
      const formatHoursToHm = (decimalHours) => {
        if (!decimalHours || decimalHours === 0) return "0h0m";
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${hours}h${minutes}m`;
      };

      const totalHoursWorkedFormatted = formatHoursToHm(totalHoursWorked);

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        jobStatus: job.status,
        jobPriority: job.priority,
        dashboardMetrics: {
          totalHoursWorked: {
            value: totalHoursWorkedFormatted,
            unit: "",
            color: "blue"
          },
          totalMaterialUsed: {
            value: totalMaterialUsed,
            unit: "items",
            color: "green"
          },
          totalLabourEntries: {
            value: totalLabourEntries,
            unit: "entries",
            color: "purple"
          },
          numberOfInvoices: {
            value: numberOfInvoices,
            unit: "invoices",
            color: "orange"
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        },
        jobDetails: {
          jobType: job.job_type,
          estimatedHours: job.estimated_hours || 0,
          estimatedCost: job.estimated_cost || 0,
          dueDate: job.due_date,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }
      };
    } catch (error) {
      throw error;
    }
  }


  static async checkJobRelationships(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const relationships = [];


      const { data: laborData, error: laborError } = await supabase
        .from('labor')
        .select('id, user_id, labor_code')
        .eq('job_id', jobId)
        .limit(1);

      if (!laborError && laborData && laborData.length > 0) {
        relationships.push({
          table: 'labor',
          count: laborData.length,
          message: 'This job has assigned labor workers'
        });
      }


      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_name')
        .eq('job_id', jobId)
        .limit(1);

      if (!productsError && productsData && productsData.length > 0) {
        relationships.push({
          table: 'products',
          count: productsData.length,
          message: 'This job has assigned materials/products'
        });
      }


      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select('id, estimate_title')
        .eq('job_id', jobId)
        .limit(1);

      if (!estimatesError && estimatesData && estimatesData.length > 0) {
        relationships.push({
          table: 'estimates',
          count: estimatesData.length,
          message: 'This job has associated estimates'
        });
      }


      const { data: transactionsData, error: transactionsError } = await supabase
        .from('job_transactions')
        .select('id, invoice_type')
        .eq('job_id', jobId)
        .limit(1);

      if (!transactionsError && transactionsData && transactionsData.length > 0) {
        relationships.push({
          table: 'job_transactions',
          count: transactionsData.length,
          message: 'This job has associated transactions/invoices'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTimesheetDashboardStats() {
    try {
      // Get all timesheets from new table
      const { data: timesheets, error } = await supabase
        .from('labor_timesheets')
        .select('*');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let totalTimesheets = 0;
      let pendingApproval = 0;
      let totalHours = 0;
      let billableHours = 0;

      // Process each timesheet
      (timesheets || []).forEach(timesheet => {
        totalTimesheets++;

        // Get status (prefer status field, fallback to job_status)
        const currentStatus = timesheet.status || timesheet.job_status || 'pending';

        // Check if pending approval (status not 'approved')
        if (currentStatus !== 'approved') {
          pendingApproval++;
        }

        // Calculate hours from start_time and end_time
        if (timesheet.start_time && timesheet.end_time) {
          const start = new Date(`2000-01-01T${timesheet.start_time}`);
          const end = new Date(`2000-01-01T${timesheet.end_time}`);
          const diffMs = end - start;
          const hours = diffMs / (1000 * 60 * 60); // Convert to hours

          totalHours += hours;

          // If status is approved, it's billable
          if (currentStatus === 'approved') {
            billableHours += hours;
          }
        }
      });

      return {
        total: totalTimesheets,
        pending: pendingApproval,
        totalHours: Math.round(totalHours),
        billableHours: Math.round(billableHours)
      };
    } catch (error) {
      throw error;
    }
  }

  static async searchMyJobs(user, searchText, pagination = {}) {
    try {
      const q = (searchText || '').toLowerCase().trim();

      // Fetch all jobs with relationships
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);
      const normalizeType = (val) => (val || '').toString().toLowerCase().replace(/[\s-]+/g, '_').trim();

      // Determine user context
      const userRole = (user?.role || '').toString();

      // Helper to check assignment
      const isAssignedToLabor = (job, userId) => {
        const hasLabor = Array.isArray(job.assigned_labor) && job.assigned_labor.some(l => l.user?.id === userId);
        const hasCustomLabor = Array.isArray(job.custom_labor) && job.custom_labor.some(l => l.user?.id === userId);
        return hasLabor || hasCustomLabor;
      };
      const isAssignedToLead = (job, userId) => Array.isArray(job.assigned_lead_labor) && job.assigned_lead_labor.some(l => l.user?.id === userId);

      const matches = (job) => {
        // Filter by assignment based on role
        let assignedMatch = true;
        if (userRole && userRole.toLowerCase().includes('lead')) {
          assignedMatch = isAssignedToLead(job, user.id);
        } else if (userRole && userRole.toLowerCase().includes('labor')) {
          assignedMatch = isAssignedToLabor(job, user.id);
        }

        if (!assignedMatch) return false;

        // Optional text search
        if (q) {
          const jobMatch = inStr(job.job_title) || inStr(job.description);
          const custMatch = inStr(job.customer?.customer_name) || inStr(job.customer?.company_name);
          const contrMatch = inStr(job.contractor?.contractor_name) || inStr(job.contractor?.company_name);
          const laborMatch = Array.isArray(job.assigned_labor) ? job.assigned_labor.some(l => inStr(l.user?.full_name)) : false;
          const leadMatch = Array.isArray(job.assigned_lead_labor) ? job.assigned_lead_labor.some(l => inStr(l.user?.full_name)) : false;
          if (!(jobMatch || custMatch || contrMatch || laborMatch || leadMatch)) return false;
        }

        // job_type filter
        if (pagination.job_type && pagination.job_type.toString().trim().length > 0) {
          const jt = normalizeType(pagination.job_type);
          if (jt !== 'all' && jt !== 'all_types') {
            if (normalizeType(job.job_type) !== jt) return false;
          }
        }

        // status filter (single or list)
        if (pagination.status && pagination.status.toString().trim().length > 0) {
          const list = pagination.status.toString().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
          if (list.length > 0) {
            if (!list.includes((job.status || '').toString().toLowerCase())) return false;
          }
        }

        // priority filter (single or list)
        if (pagination.priority && pagination.priority.toString().trim().length > 0) {
          const list = pagination.priority.toString().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
          if (list.length > 0) {
            if (!list.includes((job.priority || '').toString().toLowerCase())) return false;
          }
        }

        return true;
      };

      const filtered = jobsWithDetails.filter(matches);

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        jobs: sliced,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async getDistinctJobTypes() {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("job_type")
        .not('job_type', 'is', null);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const unique = Array.from(new Set((data || []).map(r => (r.job_type || '').toString()))).filter(v => v.trim().length > 0);
      return unique;
    } catch (error) {
      throw error;
    }
  }

  static parseHoursToDecimal(timeString) {
    if (!timeString) return 0;

    // Handle format like "08:00:00" or "8h"
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours + (minutes / 60) + (seconds / 3600);
    } else if (timeString.includes('h')) {
      return parseFloat(timeString.replace('h', '')) || 0;
    }

    return parseFloat(timeString) || 0;
  }
}