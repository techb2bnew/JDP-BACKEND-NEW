export const createJobSchema = {
  body: {
    type: 'object',
    required: ['job_title', 'job_type'],
    properties: {
      job_title: {
        type: 'string',
        minLength: 2,
        maxLength: 200,
        description: 'Job title (required)'
      },
      job_type: {
        type: 'string',
        enum: ['service_based', 'contract_based'],
        description: 'Job type (required)'
      },
      customer_id: {
        type: 'integer',
        minimum: 1,
        description: 'Customer ID'
      },
      contractor_id: {
        type: 'integer',
        minimum: 1,
        description: 'Contractor ID'
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Job description'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        description: 'Job priority'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Job address'
      },
      city_zip: {
        type: 'string',
        maxLength: 100,
        description: 'City and ZIP code'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Phone number'
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Email address'
      },
      bill_to_address: {
        type: 'string',
        maxLength: 500,
        minLength: 0,
        description: 'Billing address'
      },
      bill_to_city_zip: {
        type: 'string',
        maxLength: 100,
        description: 'Billing city and ZIP'
      },
      bill_to_phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Billing phone number'
      },
      bill_to_email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Billing email address'
      },
      same_as_address: {
        type: 'boolean',
        default: false,
        description: 'Same as job address'
      },
      due_date: {
        type: 'string',
        description: 'Due date (any format)'
      },
      estimated_hours: {
        type: 'number',
        minimum: 0,
        description: 'Estimated hours'
      },
      estimated_cost: {
        type: 'number',
        minimum: 0,
        description: 'Estimated cost'
      },
      assigned_lead_labor_ids: {
        type: 'string',
        description: 'JSON array of lead labor IDs'
      },
      assigned_labor_ids: {
        type: 'string',
        description: 'JSON array of labor IDs'
      },
      assigned_material_ids: {
        type: 'string',
        description: 'JSON array of material IDs'
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending'],
        default: 'draft',
        description: 'Job status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      },
      created_from: {
        type: 'string',
        enum: ['admin', 'app'],
        default: 'admin',
        description: 'Source of job creation (admin panel or mobile app)'
      },
      work_activity: {
        type: 'string',
        description: 'Work activity description or count as string'
      },
      total_work_time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}:\\d{2}$',
        description: 'Total work time in HH:MM:SS format'
      },
      start_timer: {
        type: 'string',
        format: 'date-time',
        description: 'Start timer timestamp'
      },
      end_timer: {
        type: 'string',
        format: 'date-time',
        description: 'End timer timestamp'
      },
      pause_timer: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Pause reason title (e.g., "Lunch Break", "Equipment Issue")'
            },
            duration: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Pause duration in HH:MM:SS format'
            }
          },
          required: ['title', 'duration']
        },
        description: 'Array of pause timer objects with title and duration (e.g., [{"title": "Lunch Break", "duration": "00:30:45"}])'
      }
    }
  }
};

export const updateJobSchema = {
  body: {
    type: 'object',
    properties: {
      job_title: {
        type: 'string',
        minLength: 2,
        maxLength: 200,
        description: 'Job title'
      },
      job_type: {
        type: 'string',
        enum: ['service_based', 'contract_based'],
        description: 'Job type'
      },
      customer_id: {
        type: 'integer',
        minimum: 1,
        description: 'Customer ID'
      },
      contractor_id: {
        type: 'integer',
        minimum: 1,
        description: 'Contractor ID'
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Job description'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Job priority'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Job address'
      },
      city_zip: {
        type: 'string',
        maxLength: 100,
        description: 'City and ZIP code'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Phone number'
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Email address'
      },
      bill_to_address: {
        type: 'string',
        maxLength: 500,
        minLength: 0,
        description: 'Billing address'
      },
      bill_to_city_zip: {
        type: 'string',
        maxLength: 100,
        description: 'Billing city and ZIP'
      },
      bill_to_phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Billing phone number'
      },
      bill_to_email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Billing email address'
      },
      same_as_address: {
        type: 'boolean',
        description: 'Same as job address'
      },
      due_date: {
        type: 'string',
        description: 'Due date (any format)'
      },
      estimated_hours: {
        type: 'number',
        minimum: 0,
        description: 'Estimated hours'
      },
      estimated_cost: {
        type: 'number',
        minimum: 0,
        description: 'Estimated cost'
      },
      assigned_lead_labor_ids: {
        type: 'string',
        description: 'JSON array of lead labor IDs'
      },
      assigned_labor_ids: {
        type: 'string',
        description: 'JSON array of labor IDs'
      },
      assigned_material_ids: {
        type: 'string',
        description: 'JSON array of material IDs'
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending'],
        description: 'Job status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      },
      created_from: {
        type: 'string',
        enum: ['admin', 'app'],
        description: 'Source of job creation (admin panel or mobile app)'
      },
      work_activity: {
        type: 'string',
        description: 'Work activity description or count as string'
      },
      total_work_time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}:\\d{2}$',
        description: 'Total work time in HH:MM:SS format'
      },
      start_timer: {
        type: 'string',
        format: 'date-time',
        description: 'Start timer timestamp'
      },
      end_timer: {
        type: 'string',
        format: 'date-time',
        description: 'End timer timestamp'
      },
      pause_timer: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Pause reason title (e.g., "Lunch Break", "Equipment Issue")'
            },
            duration: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Pause duration in HH:MM:SS format'
            }
          },
          required: ['title', 'duration']
        },
        description: 'Array of pause timer objects with title and duration (e.g., [{"title": "Lunch Break", "duration": "00:30:45"}])'
      }
    }
  }
};

export const updateWorkDataSchema = {
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        pattern: '^[0-9]+$',
        description: 'Job ID'
      }
    },
    required: ['id'],
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      work_activity: {
        type: 'string',
        description: 'Work activity description or count as string'
      },
      total_work_time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}:\\d{2}$',
        description: 'Total work time in HH:MM:SS format'
      },
      start_timer: {
        type: 'string',
        format: 'date-time',
        description: 'Start timer timestamp'
      },
      end_timer: {
        type: 'string',
        format: 'date-time',
        description: 'End timer timestamp'
      },
      pause_timer: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Pause reason title (e.g., "Lunch Break", "Equipment Issue")'
            },
            duration: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Pause duration in HH:MM:SS format'
            }
          },
          required: ['title', 'duration']
        },
        description: 'Array of pause timer objects with title and duration (e.g., [{"title": "Lunch Break", "duration": "00:30:45"}])'
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending'],
        description: 'Job status (draft, active, in_progress, completed, cancelled, on_hold)'
      },
      labor_timesheet: {
        type: 'object',
        properties: {
          labor_id: {
            type: 'integer',
            minimum: 1,
            description: 'Labor ID (optional if lead_labor_id is provided)'
          },
          user_id: {
            type: 'integer',
            minimum: 1,
            description: 'User ID of the labor'
          },
          labor_name: {
            type: 'string',
            description: 'Name of the labor'
          },
          lead_labor_id: {
            type: 'integer',
            minimum: 1,
            description: 'Lead Labor ID (optional if labor_id is provided)'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Date of work (YYYY-MM-DD)'
          },
          start_time: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Start time in HH:MM:SS format'
          },
          end_time: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'End time in HH:MM:SS format'
          },
          total_hours: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Total hours worked in HH:MM:SS format'
          },
          break_duration: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Break duration in HH:MM:SS format'
          },
          work_hours: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Actual work hours (total - breaks) in HH:MM:SS format'
          },
          hourly_rate: {
            type: 'number',
            minimum: 0,
            description: 'Hourly rate for this labor'
          },
          total_cost: {
            type: 'number',
            minimum: 0,
            description: 'Total cost for this timesheet entry'
          },
          work_activity: {
            type: 'string',
            description: 'Work activity description or count as string'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'paused'],
            description: 'Timesheet status'
          },
          job_status: {
            type: 'string',
            enum: ['in_progress', 'completed', 'on_hold', 'cancelled'],
            description: 'Job status for this timesheet entry'
          },
          notes: {
            type: 'string',
            description: 'Additional notes for this timesheet entry'
          }
        },
        required: ['date'],
        description: 'Individual labor timesheet data (requires either labor_id or lead_labor_id)'
      },
      lead_labor_timesheet: {
        type: 'object',
        properties: {
          lead_labor_id: {
            type: 'integer',
            minimum: 1,
            description: 'Lead Labor ID'
          },
          user_id: {
            type: 'integer',
            minimum: 1,
            description: 'User ID of the lead labor'
          },
          labor_name: {
            type: 'string',
            description: 'Name of the lead labor'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Date of work (YYYY-MM-DD)'
          },
          start_time: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Start time in HH:MM:SS format'
          },
          end_time: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'End time in HH:MM:SS format'
          },
          total_hours: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Total hours worked in HH:MM:SS format'
          },
          break_duration: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Break duration in HH:MM:SS format'
          },
          work_hours: {
            type: 'string',
            pattern: '^\\d{2}:\\d{2}:\\d{2}$',
            description: 'Actual work hours (total - breaks) in HH:MM:SS format'
          },
          hourly_rate: {
            type: 'number',
            minimum: 0,
            description: 'Hourly rate for this lead labor'
          },
          total_cost: {
            type: 'number',
            minimum: 0,
            description: 'Total cost for this timesheet entry'
          },
          work_activity: {
            type: 'string',
            description: 'Work activity description or count as string'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'paused'],
            description: 'Timesheet status'
          },
          notes: {
            type: 'string',
            description: 'Additional notes for this timesheet entry'
          }
        },
        required: ['lead_labor_id', 'date'],
        description: 'Individual lead labor timesheet data'
      },
      bulk_timesheets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            labor_id: {
              type: 'integer',
              minimum: 1,
              description: 'Labor ID'
            },
            user_id: {
              type: 'integer',
              minimum: 1,
              description: 'User ID of the labor (optional - auto-fetched)'
            },
            labor_name: {
              type: 'string',
              description: 'Name of the labor (optional - auto-fetched)'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Date of work (YYYY-MM-DD)'
            },
            start_time: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Start time in HH:MM:SS format'
            },
            end_time: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'End time in HH:MM:SS format'
            },
            total_hours: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Total hours worked in HH:MM:SS format (optional - auto-calculated)'
            },
            break_duration: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Break duration in HH:MM:SS format (optional - auto-calculated)'
            },
            work_hours: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}:\\d{2}$',
              description: 'Actual work hours in HH:MM:SS format (optional - auto-calculated)'
            },
            hourly_rate: {
              type: 'number',
              minimum: 0,
              description: 'Hourly rate for this labor (optional - auto-fetched)'
            },
            total_cost: {
              type: 'number',
              minimum: 0,
              description: 'Total cost for this timesheet entry (optional - auto-calculated)'
            },
            work_activity: {
              type: 'integer',
              minimum: 0,
              description: 'Work activity count'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'paused'],
              description: 'Timesheet status'
            },
            job_status: {
              type: 'string',
              enum: ['in_progress', 'completed', 'on_hold', 'cancelled'],
              description: 'Job status for this timesheet entry'
            },
            notes: {
              type: 'string',
              description: 'Additional notes for this timesheet entry'
            },
            pause_timer: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    maxLength: 200,
                    description: 'Pause reason title'
                  },
                  duration: {
                    type: 'string',
                    pattern: '^\\d{2}:\\d{2}:\\d{2}$',
                    description: 'Pause duration in HH:MM:SS format'
                  }
                },
                required: ['title', 'duration']
              },
              description: 'Array of pause timer objects'
            }
          },
          required: ['labor_id', 'date'],
          additionalProperties: false
        },
        description: 'Array of timesheet entries for bulk update'
      }
    },
    additionalProperties: false
  }
};

export const getJobsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Page number for pagination'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10,
        description: 'Number of items per page'
      },
      search: {
        type: 'string',
        description: 'Search term for job title or description'
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending'],
        description: 'Filter by job status'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Filter by job priority'
      },
      job_type: {
        type: 'string',
        enum: ['service_based', 'contract_based'],
        description: 'Filter by job type'
      },
      customer_id: {
        type: 'integer',
        minimum: 1,
        description: 'Filter by customer ID'
      },
      contractor_id: {
        type: 'integer',
        minimum: 1,
        description: 'Filter by contractor ID'
      },
      created_from: {
        type: 'string',
        enum: ['admin', 'app'],
        description: 'Filter by creation source'
      },
      sortBy: {
        type: 'string',
        enum: ['job_title', 'priority', 'due_date', 'created_at', 'updated_at'],
        default: 'created_at',
        description: 'Field to sort by'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order'
      }
    }
  }
};

export const getJobByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Job ID'
      }
    }
  }
};

export const deleteJobSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Job ID'
      }
    }
  }
};
