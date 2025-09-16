export const createCustomerSchema = {
  body: {
    type: 'object',
    required: ['customer_name'],
    properties: {
      customer_name: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
        description: 'Customer name (required)'
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
        description: 'Customer email address'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Customer phone number'
      },
      contact_person: {
        type: 'string',
        maxLength: 100,
        description: 'Contact person name'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Customer address'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'pending', 'suspended'],
        default: 'active',
        description: 'Customer status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
    }
  }
};

export const updateCustomerSchema = {
  body: {
    type: 'object',
    properties: {
      customer_name: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
        description: 'Customer name'
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
        description: 'Customer email address'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        description: 'Customer phone number'
      },
      contact_person: {
        type: 'string',
        maxLength: 100,
        description: 'Contact person name'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Customer address'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'pending', 'suspended'],
        description: 'Customer status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
    }
  }
};

export const getCustomersSchema = {
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
        description: 'Search term for customer name, company, email, or phone'
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'pending', 'suspended'],
        description: 'Filter by customer status'
      },
      sortBy: {
        type: 'string',
        enum: ['customer_name', 'company_name', 'email', 'created_at', 'updated_at'],
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

export const getCustomerByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Customer ID'
      }
    }
  }
};

export const deleteCustomerSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
        description: 'Customer ID'
      }
    }
  }
};
