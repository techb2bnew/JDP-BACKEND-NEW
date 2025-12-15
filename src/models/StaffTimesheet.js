import { supabase } from '../config/database.js';
import { Job } from './Job.js';

export class StaffTimesheet {
  static async create(timesheetData) {
    try {
      // Calculate total_hours if start_time and end_time are provided
      if (timesheetData.start_time && timesheetData.end_time && !timesheetData.total_hours) {
        const start = new Date(`2000-01-01T${timesheetData.start_time}`);
        const end = new Date(`2000-01-01T${timesheetData.end_time}`);
        const diffMs = end - start;
        timesheetData.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      const { data, error } = await supabase
        .from('staff_timesheets')
        .insert([timesheetData])
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }

      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }

      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      if (filters.title) {
        query = query.ilike('title', `%${filters.title}%`);
      }

      // Apply pagination
      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'date';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        data: data || [],
        count: count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByStaffId(staffId, filters = {}) {
    try {
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .eq('staff_id', staffId);

      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Calculate total_hours if start_time and end_time are provided
      if (updateData.start_time && updateData.end_time && !updateData.total_hours) {
        const start = new Date(`2000-01-01T${updateData.start_time}`);
        const end = new Date(`2000-01-01T${updateData.end_time}`);
        const diffMs = end - start;
        updateData.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('staff_timesheets')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Staff timesheet not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('staff_timesheets')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getAllStaffWeeklyTimesheetSummary(startDate, endDate, pagination = {}, staffId = null) {
    try {
      let actualStartDate = startDate;
      let actualEndDate = endDate;

      // If dates are provided, ensure they align to week boundaries (Monday to Sunday)
      // For weekly summary, use only the first week (7 days) from start date
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        
        // Get Monday of the week for start date
        const startDayOfWeek = startDateObj.getDay();
        const startDaysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
        const startMonday = new Date(startDateObj);
        startMonday.setDate(startDateObj.getDate() + startDaysToMonday);
        
        // For weekly summary, use only first week (7 days from Monday)
        const endSunday = new Date(startMonday);
        endSunday.setDate(startMonday.getDate() + 6);
        
        actualStartDate = Job.formatLocalDate(startMonday);
        actualEndDate = Job.formatLocalDate(endSunday);
      } else if (!startDate || !endDate) {
        // If no dates provided, get all timesheets date range (earliest to latest)
        let query = supabase
          .from('staff_timesheets')
          .select('date')
          .order('date', { ascending: true })
          .limit(1);
        
        if (staffId) {
          query = query.eq('staff_id', staffId);
        }
        
        const { data: earliestTimesheet, error: earliestError } = await query.single();

        query = supabase
          .from('staff_timesheets')
          .select('date')
          .order('date', { ascending: false })
          .limit(1);
        
        if (staffId) {
          query = query.eq('staff_id', staffId);
        }
        
        const { data: latestTimesheet, error: latestError } = await query.single();

        if (earliestError && earliestError.code !== 'PGRST116') {
          throw new Error(`Database error: ${earliestError.message}`);
        }
        if (latestError && latestError.code !== 'PGRST116') {
          throw new Error(`Database error: ${latestError.message}`);
        }

        if (earliestTimesheet && earliestTimesheet.date && latestTimesheet && latestTimesheet.date) {
          // Get the Monday of the week containing the earliest date
          const earliestDateObj = new Date(earliestTimesheet.date);
          const earliestDayOfWeek = earliestDateObj.getDay();
          const earliestDaysToMonday = earliestDayOfWeek === 0 ? -6 : 1 - earliestDayOfWeek;

          const earliestMonday = new Date(earliestDateObj);
          earliestMonday.setDate(earliestDateObj.getDate() + earliestDaysToMonday);

          // Get the Sunday of the week containing the latest date
          const latestDateObj = new Date(latestTimesheet.date);
          const latestDayOfWeek = latestDateObj.getDay();
          const latestDaysToMonday = latestDayOfWeek === 0 ? -6 : 1 - latestDayOfWeek;

          const latestMonday = new Date(latestDateObj);
          latestMonday.setDate(latestDateObj.getDate() + latestDaysToMonday);

          const latestSunday = new Date(latestMonday);
          latestSunday.setDate(latestMonday.getDate() + 6);

          actualStartDate = Job.formatLocalDate(earliestMonday);
          actualEndDate = Job.formatLocalDate(latestSunday);
        } else {
          // Fallback to current week if no timesheets found
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

      // Fetch all staff timesheets
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .gte('date', actualStartDate)
        .lte('date', actualEndDate)
        .order('date', { ascending: false });

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data: allTimesheets, error: timesheetsError } = await query;

      if (timesheetsError) {
        throw new Error(`Database error: ${timesheetsError.message}`);
      }

      const allDashboardTimesheets = [];
      const timesheetsByStaff = {};

      // Group timesheets by staff_id
      (allTimesheets || []).forEach(ts => {
        const staffIdKey = ts.staff_id;
        if (!staffIdKey) {
          console.warn('Timesheet without staff_id found:', ts.id);
          return;
        }
        if (!timesheetsByStaff[staffIdKey]) {
          timesheetsByStaff[staffIdKey] = {
            staff_id: staffIdKey,
            staff_name: ts.staff?.users?.full_name || 'Unknown',
            timesheets: []
          };
        }
        timesheetsByStaff[staffIdKey].timesheets.push(ts);
      });

      // Process each staff member's timesheets
      for (const staffIdKey in timesheetsByStaff) {
        const staff = timesheetsByStaff[staffIdKey];
        const staffTimesheets = staff.timesheets;

        const staffSummary = {
          staff_id: staff.staff_id,
          staff_name: staff.staff_name,
          total_hours: 0,
          daily_breakdown: {}
        };

        staffTimesheets.forEach(timesheet => {
          // Calculate hours from start_time and end_time
          let hours = 0;
          let timeValue = "00:00:00";
          
          if (timesheet.start_time && timesheet.end_time) {
            const start = new Date(`2000-01-01T${timesheet.start_time}`);
            const end = new Date(`2000-01-01T${timesheet.end_time}`);
            const diffMs = end - start;
            hours = diffMs / (1000 * 60 * 60);

            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            timeValue = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
          } else if (timesheet.total_hours) {
            hours = parseFloat(timesheet.total_hours) || 0;
            timeValue = Job.hoursToTime(hours);
          }

          staffSummary.total_hours += hours;
          
          // Normalize date to YYYY-MM-DD format
          const dateKey = Job.formatLocalDate(timesheet.date);
          if (staffSummary.daily_breakdown[dateKey]) {
            // Aggregate hours for same date
            const existingHours = Job.timeToHours(staffSummary.daily_breakdown[dateKey].hours || "00:00:00");
            const newTotalHours = existingHours + hours;
            staffSummary.daily_breakdown[dateKey].hours = Job.hoursToTime(newTotalHours);
            staffSummary.daily_breakdown[dateKey].title = timesheet.title || staffSummary.daily_breakdown[dateKey].title;
          } else {
            // First entry for this date
            staffSummary.daily_breakdown[dateKey] = {
              hours: timeValue,
              title: timesheet.title || null,
              job: timesheet.job ? `${timesheet.job.job_title} (Job-${timesheet.job.id})` : null,
              job_id: timesheet.job_id || null
            };
          }
        });

        // Generate weekly view
        const datesWithData = Object.keys(staffSummary.daily_breakdown).filter(date => {
          const data = staffSummary.daily_breakdown[date];
          return data && data.hours;
        });

        let weekStartDate, weekEndDate;
        
        if (datesWithData.length > 0) {
          // Find earliest date
          const earliestDate = datesWithData.sort()[0];
          const earliestDateObj = new Date(earliestDate);
          const earliestDayOfWeek = earliestDateObj.getDay();
          const earliestDaysToMonday = earliestDayOfWeek === 0 ? -6 : 1 - earliestDayOfWeek;
          const monday = new Date(earliestDateObj);
          monday.setDate(earliestDateObj.getDate() + earliestDaysToMonday);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          
          weekStartDate = Job.formatLocalDate(monday);
          weekEndDate = Job.formatLocalDate(sunday);
        } else {
          weekStartDate = actualStartDate;
          weekEndDate = actualEndDate;
        }

        const start = new Date(weekStartDate);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const totalDaysInRange = 7;
        const weekDays = [];

        for (let i = 0; i < totalDaysInRange; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          weekDays.push(Job.formatLocalDate(day));
        }

        const employeeHours = {};
        let totalHours = 0;
        let billableHours = 0;

        weekDays.forEach((dayDate) => {
          const actualDay = new Date(dayDate);
          const dayOfWeek = actualDay.getDay();
          const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayNameIndex];

          const dailyData = staffSummary.daily_breakdown[dayDate];

          if (dailyData) {
            const timeValue = dailyData.hours || "00:00:00";
            const hoursValue = Job.timeToHours(timeValue);
            employeeHours[dayName.toLowerCase()] = Job.formatTimeDisplay(hoursValue);
            totalHours += hoursValue;
            billableHours += hoursValue;
          } else {
            employeeHours[dayName.toLowerCase()] = '0h';
          }
        });

        // Get job title from first timesheet (if job linked)
        const firstTimesheet = staffTimesheets[0];
        const jobTitle = firstTimesheet?.job ? `${firstTimesheet.job.job_title} (Job-${firstTimesheet.job.id})` : 'General Work';
        const jobId = firstTimesheet?.job_id || null;

        allDashboardTimesheets.push({
          employee: staff.staff_name,
          job: jobTitle,
          job_id: jobId,
          staff_id: staff.staff_id,
          labor_id: null,
          lead_labor_id: null,
          week: `${weekStartDate} - ${weekEndDate}`,
          ...employeeHours,
          total: Job.formatTimeDisplay(totalHours),
          billable: Job.formatTimeDisplay(billableHours),
          hourly_rate: 0, // Staff may not have hourly rate
          weekly_payment: 0, // Calculate if needed
          status: 'Active',
          actions: []
        });
      }

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

  static async getWeeklyTimesheetView(staffId, startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('start_date and end_date are required');
      }

      if (!staffId) {
        throw new Error('staff_id is required');
      }

      // Fetch staff timesheets
      const { data: timesheets, error: timesheetsError } = await supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (timesheetsError) {
        throw new Error(`Database error: ${timesheetsError.message}`);
      }

      if (!timesheets || timesheets.length === 0) {
        return {
          employee_name: null,
          hourly_rate: 0,
          daily_breakdown: [],
          week_total: {
            total_hours: 0,
            hourly_rate: 0,
            total_pay: 0
          }
        };
      }

      // Get employee name (staff hourly_rate is typically 0, but checking if it exists)
      const firstTimesheet = timesheets[0];
      const employeeName = firstTimesheet.staff?.users?.full_name || 'Unknown';
      const hourlyRate = 0; // Staff typically don't have hourly rates, but can be updated if needed

      // Group timesheets by date and job
      const dailyBreakdown = [];
      const timesheetsByDate = {};

      timesheets.forEach(timesheet => {
        const dateKey = Job.formatLocalDate(timesheet.date);
        if (!timesheetsByDate[dateKey]) {
          timesheetsByDate[dateKey] = {};
        }

        const jobId = timesheet.job_id || 0; // Use 0 for null job_id (General Work)
        if (!timesheetsByDate[dateKey][jobId]) {
          timesheetsByDate[dateKey][jobId] = {
            job_id: timesheet.job_id || null,
            job_title: timesheet.job?.job_title || 'General Work',
            hours: 0,
            timesheets: []
          };
        }

        // Calculate hours from start_time and end_time
        let hours = 0;
        if (timesheet.start_time && timesheet.end_time) {
          const start = new Date(`2000-01-01T${timesheet.start_time}`);
          const end = new Date(`2000-01-01T${timesheet.end_time}`);
          const diffMs = end - start;
          hours = diffMs / (1000 * 60 * 60);
        } else if (timesheet.total_hours) {
          hours = parseFloat(timesheet.total_hours) || 0;
        }

        timesheetsByDate[dateKey][jobId].hours += hours;
        timesheetsByDate[dateKey][jobId].timesheets.push(timesheet);
      });

      // Generate all days in the week
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      let totalHours = 0;
      let currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = Job.formatLocalDate(currentDate);
        const dayOfWeek = currentDate.getDay();
        const dayName = dayNames[dayOfWeek];
        const monthName = monthNames[currentDate.getMonth()];
        const day = currentDate.getDate();
        const year = currentDate.getFullYear();
        
        const formattedDate = `${monthName} ${day}, ${year}`;
        
        const dateTimesheets = timesheetsByDate[dateStr] || {};
        const jobIds = Object.keys(dateTimesheets);

        if (jobIds.length === 0) {
          // No work on this day - show as Leave
          dailyBreakdown.push({
            date: dateStr,
            formatted_date: formattedDate,
            day: dayName,
            job_id: null,
            job_title: 'Leave',
            hours_worked: 0,
            hours_worked_display: '0h',
            pay_amount: 0
          });
        } else {
          // Add each job entry for this day
          jobIds.forEach(jobId => {
            const jobData = dateTimesheets[jobId];
            const hoursWorked = jobData.hours;
            const payAmount = hoursWorked * hourlyRate;
            totalHours += hoursWorked;

            dailyBreakdown.push({
              date: dateStr,
              formatted_date: formattedDate,
              day: dayName,
              job_id: jobData.job_id,
              job_title: jobData.job_title,
              hours_worked: parseFloat(hoursWorked.toFixed(2)),
              hours_worked_display: Job.formatTimeDisplay(hoursWorked),
              pay_amount: parseFloat(payAmount.toFixed(2))
            });
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalPay = totalHours * hourlyRate;

      return {
        employee_name: employeeName,
        hourly_rate: hourlyRate,
        period: {
          start_date: startDate,
          end_date: endDate,
          week_range: `${startDate} - ${endDate}`
        },
        daily_breakdown: dailyBreakdown,
        week_total: {
          total_hours: parseFloat(totalHours.toFixed(2)),
          total_hours_display: Job.formatTimeDisplay(totalHours),
          hourly_rate: hourlyRate,
          total_pay: parseFloat(totalPay.toFixed(2))
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async searchStaffTimesheets(filters, pagination = {}) {
    try {
      // Fetch staff timesheets with date filters
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `);

      // Apply date filters
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

      // Filter by name and q (search query)
      const q = (filters.q || '').toLowerCase().trim();
      const nameFilter = (filters.name || '').toLowerCase().trim();

      const timesheetRows = [];

      for (const ts of timesheets || []) {
        const staffName = ts.staff?.users?.full_name || 'Unknown';
        const isStaffName = (staffName || '').toLowerCase();
        const jobTitle = (ts.job?.job_title || '').toLowerCase();
        const jobIdStr = (ts.job?.id || '').toString();

        // Apply q (search) filter
        if (q && q.length > 0) {
          const hit = (isStaffName && isStaffName.includes(q)) || 
                      (jobTitle && jobTitle.includes(q)) || 
                      (jobIdStr && jobIdStr.includes(q));
          if (!hit) continue;
        }

        // Apply name filter
        if (nameFilter && !isStaffName.includes(nameFilter)) continue;

        // Calculate hours
        let hours = '00:00:00';
        if (ts.start_time && ts.end_time) {
          const start = new Date(`2000-01-01T${ts.start_time}`);
          const end = new Date(`2000-01-01T${ts.end_time}`);
          const diffMs = end - start;
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          hours = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
        } else if (ts.total_hours) {
          hours = Job.hoursToTime(parseFloat(ts.total_hours) || 0);
        }

        timesheetRows.push({
          employee: staffName,
          job: ts.job ? `${ts.job.job_title} (Job-${ts.job.id})` : 'General Work',
          job_id: ts.job_id || null,
          staff_id: ts.staff_id,
          date: ts.date,
          hours: hours,
          status: ts.status || 'pending',
          title: ts.title || null
        });
      }

      // If no results after filtering, return empty response
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

      // Determine actual start and end dates
      let actualStartDate, actualEndDate;
      if (filters.start_date && filters.end_date) {
        // Use filter dates and align to week boundaries
        const startDateObj = new Date(filters.start_date);
        const startDayOfWeek = startDateObj.getDay();
        const startDaysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
        const startMonday = new Date(startDateObj);
        startMonday.setDate(startDateObj.getDate() + startDaysToMonday);
        
        const endSunday = new Date(startMonday);
        endSunday.setDate(startMonday.getDate() + 6);
        
        actualStartDate = Job.formatLocalDate(startMonday);
        actualEndDate = Job.formatLocalDate(endSunday);
      } else {
        // Find earliest and latest dates from filtered results
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

      // Group by staff_id and job_id (similar to labor timesheet logic)
      const buckets = new Map();
      const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      const ensureRow = (key, employee, jobTitle, jobId, staffId) => {
        if (!buckets.has(key)) {
          const base = { 
            employee, 
            job: jobTitle, 
            job_id: jobId, 
            staff_id: staffId,
            labor_id: null,
            lead_labor_id: null,
            hourly_rate: 0,
            daily_dates: []
          };
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
        // Convert dates to Date objects for accurate comparison
        const recordDate = new Date(r.date);
        const startDate = new Date(actualStartDate);
        const endDate = new Date(actualEndDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        recordDate.setHours(0, 0, 0, 0);
        
        if (recordDate < startDate || recordDate > endDate) return;

        const key = `${r.employee}|${r.job_id || 'null'}|${r.staff_id}`;
        const row = ensureRow(key, r.employee, r.job, r.job_id, r.staff_id);
        
        // Track date for week calculation
        const dateKey = Job.formatLocalDate(r.date);
        if (!row.daily_dates.includes(dateKey)) {
          row.daily_dates.push(dateKey);
        }

        // Calculate day of week
        const dt = new Date(r.date);
        const dow = dt.getDay();
        const idx = dow === 0 ? 6 : dow - 1;
        const dayKey = dayNames[idx];

        const hoursVal = Job.timeToHours(r.hours || '00:00:00');

        // Aggregate hours for the day
        const existing = parseFloat((row[dayKey] || '0h').replace('h', '').replace('m', ''));
        row[dayKey] = Job.formatTimeDisplay(hoursVal + (isNaN(existing) ? 0 : existing));

        // Calculate total properly
        const currentTotalStr = row.total || '0h';
        let currentTotalHours = 0;
        
        if (currentTotalStr.includes('h') || currentTotalStr.includes('m')) {
          const hourMatch = currentTotalStr.match(/(\d+)h/);
          const minuteMatch = currentTotalStr.match(/(\d+)m/);
          const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
          const minutes = minuteMatch ? parseFloat(minuteMatch[1]) : 0;
          currentTotalHours = hours + (minutes / 60);
        } else if (currentTotalStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
          currentTotalHours = Job.timeToHours(currentTotalStr);
        }
        
        const newTotalHours = currentTotalHours + hoursVal;
        row.total = Job.formatTimeDisplay(newTotalHours);
        row.billable = row.total;

        // Track status
        const normalized = (r.status || 'pending').toLowerCase();
        const sc = statusCountsByKey.get(key) || {};
        sc[normalized] = (sc[normalized] || 0) + 1;
        statusCountsByKey.set(key, sc);
      });

      // Process buckets and set status, week, and other fields
      buckets.forEach((row, key) => {
        const sc = statusCountsByKey.get(key) || {};
        if (sc.approved > 0) row.status = 'Approved';
        else if (sc.submitted > 0) row.status = 'Submitted';
        else if (sc.active > 0) row.status = 'Active';
        else if (sc.pending > 0) row.status = 'Pending';
        else if (sc.rejected > 0) row.status = 'Rejected';
        
        // Calculate actual week from daily_dates
        let weekStartDate, weekEndDate;
        const datesWithData = row.daily_dates || [];
        
        if (datesWithData.length > 0) {
          const earliestDate = datesWithData.sort()[0];
          const earliestDateObj = new Date(earliestDate);
          const earliestDayOfWeek = earliestDateObj.getDay();
          const earliestDaysToMonday = earliestDayOfWeek === 0 ? -6 : 1 - earliestDayOfWeek;
          const monday = new Date(earliestDateObj);
          monday.setDate(earliestDateObj.getDate() + earliestDaysToMonday);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          
          weekStartDate = Job.formatLocalDate(monday);
          weekEndDate = Job.formatLocalDate(sunday);
        } else {
          weekStartDate = actualStartDate;
          weekEndDate = actualEndDate;
        }

        row.hourly_rate = 0; // Staff may not have hourly rate
        row.weekly_payment = 0;
        row.actions = [];
        row.week = `${weekStartDate} - ${weekEndDate}`;
        
        // Remove daily_dates field from final response
        delete row.daily_dates;
      });

      const dashboard = Array.from(buckets.values());

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
}

