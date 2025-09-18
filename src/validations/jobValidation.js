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
        format: 'date',
        description: 'Due date (YYYY-MM-DD)'
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
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'],
        default: 'draft',
        description: 'Job status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
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
        format: 'date',
        description: 'Due date (YYYY-MM-DD)'
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
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'],
        description: 'Job status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
    }
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
        enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'],
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
