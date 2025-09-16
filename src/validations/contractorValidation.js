export const createContractorSchema = {
  body: {
    type: 'object',
    required: ['contractor_name'],
    properties: {
      contractor_name: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
        description: 'Contractor name (required)'
      },
      company_name: {
        type: 'string',
        maxLength: 150,
        description: 'Company name'
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Contractor email address'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Contractor phone number'
      },
      contact_person: {
        type: 'string',
        maxLength: 100,
        description: 'Contact person name'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Contractor address'
      },
      job_id: {
        type: 'string',
        maxLength: 100,
        description: 'Job ID associated with contractor'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        default: 'active',
        description: 'Contractor status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
    }
  }
};

export const updateContractorSchema = {
  body: {
    type: 'object',
    properties: {
      contractor_name: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
        description: 'Contractor name'
      },
      company_name: {
        type: 'string',
        maxLength: 150,
        description: 'Company name'
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 150,
        description: 'Contractor email address'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Contractor phone number'
      },
      contact_person: {
        type: 'string',
        maxLength: 100,
        description: 'Contact person name'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Contractor address'
      },
      job_id: {
        type: 'string',
        maxLength: 100,
        description: 'Job ID associated with contractor'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'Contractor status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
    }
  }
};

export const getContractorsSchema = {
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
        description: 'Search term for contractor name, company, email, or phone'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'Filter by contractor status'
      },
      job_id: {
        type: 'string',
        description: 'Filter by job ID'
      },
      sortBy: {
        type: 'string',
        enum: ['contractor_name', 'company_name', 'email', 'job_id', 'created_at', 'updated_at'],
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

export const getContractorByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Contractor ID'
      }
    }
  }
};

export const getContractorsByJobIdSchema = {
  params: {
    type: 'object',
    required: ['jobId'],
    properties: {
      jobId: {
        type: 'string',
        description: 'Job ID'
      }
    }
  }
};

export const deleteContractorSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Contractor ID'
      }
    }
  }
};
