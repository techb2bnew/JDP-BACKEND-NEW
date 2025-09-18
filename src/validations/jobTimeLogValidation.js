export const createJobTimeLogSchema = {
  type: 'object',
  required: ['job_id', 'worker_name', 'hours_worked', 'hourly_rate', 'work_date'],
  properties: {
    job_id: {
      type: 'integer',
      minimum: 1
    },
    labor_id: {
      type: 'integer',
      minimum: 1
    },
    lead_labor_id: {
      type: 'integer',
      minimum: 1
    },
    worker_name: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    role: {
      type: 'string',
      maxLength: 100
    },
    work_description: {
      type: 'string',
      maxLength: 1000
    },
    hours_worked: {
      type: 'number',
      minimum: 0.01,
      maximum: 24
    },
    hourly_rate: {
      type: 'number',
      minimum: 0
    },
    total_cost: {
      type: 'number',
      minimum: 0
    },
    work_date: {
      type: 'string',
      format: 'date'
    },
    status: {
      type: 'string',
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    system_ip: {
      type: 'string',
      maxLength: 45
    }
  },
  additionalProperties: false
};

export const updateJobTimeLogSchema = {
  type: 'object',
  properties: {
    job_id: {
      type: 'integer',
      minimum: 1
    },
    labor_id: {
      type: 'integer',
      minimum: 1
    },
    lead_labor_id: {
      type: 'integer',
      minimum: 1
    },
    worker_name: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    role: {
      type: 'string',
      maxLength: 100
    },
    work_description: {
      type: 'string',
      maxLength: 1000
    },
    hours_worked: {
      type: 'number',
      minimum: 0.01,
      maximum: 24
    },
    hourly_rate: {
      type: 'number',
      minimum: 0
    },
    total_cost: {
      type: 'number',
      minimum: 0
    },
    work_date: {
      type: 'string',
      format: 'date'
    },
    status: {
      type: 'string',
      enum: ['pending', 'approved', 'rejected']
    },
    system_ip: {
      type: 'string',
      maxLength: 45
    }
  },
  additionalProperties: false,
  minProperties: 1
};

export const jobTimeLogQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    limit: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    job_id: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    labor_id: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    lead_labor_id: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    work_date: {
      type: 'string'
    },
    worker_name: {
      type: 'string'
    },
    role: {
      type: 'string'
    },
    status: {
      type: 'string',
      enum: ['pending', 'approved', 'rejected']
    },
    sortBy: {
      type: 'string',
      enum: ['work_date', 'created_at', 'hours_worked', 'total_cost']
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc']
    }
  },
  additionalProperties: false
};
