export const createProductSchema = {
  type: 'object',
  required: ['product_name', 'supplier_id'],
  properties: {
    product_name: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    category: {
      type: 'string',
      maxLength: 100
    },
    supplier_id: {
      type: 'integer',
      minimum: 1
    },
    job_id: {
      type: 'integer',
      minimum: 1
    },
    is_custom: {
      type: 'boolean',
      default: false
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    supplier_sku: {
      type: 'string',
      maxLength: 100
    },
    jdp_sku: {
      type: 'string',
      maxLength: 100
    },
    supplier_cost_price: {
      type: 'number',
      minimum: 0
    },
    unit_cost: {
      type: 'number',
      minimum: 0
    },
    markup_percentage: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    markup_amount: {
      type: 'number',
      minimum: 0
    },
    jdp_price: {
      type: 'number',
      minimum: 0
    },
    profit_margin: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    stock_quantity: {
      type: 'integer',
      minimum: 0
    },
    unit: {
      type: 'string',
      maxLength: 50
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'draft'],
      default: 'active'
    },
    system_ip: {
      type: 'string',
      maxLength: 45
    }
  },
  additionalProperties: false
};

export const updateProductSchema = {
  type: 'object',
  properties: {
    product_name: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    category: {
      type: 'string',
      maxLength: 100
    },
    supplier_id: {
      type: 'integer',
      minimum: 1
    },
    job_id: {
      type: 'integer',
      minimum: 1
    },
    is_custom: {
      type: 'boolean'
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    supplier_sku: {
      type: 'string',
      maxLength: 100
    },
    jdp_sku: {
      type: 'string',
      maxLength: 100
    },
    supplier_cost_price: {
      type: 'number',
      minimum: 0
    },
    unit_cost: {
      type: 'number',
      minimum: 0
    },
    markup_percentage: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    markup_amount: {
      type: 'number',
      minimum: 0
    },
    jdp_price: {
      type: 'number',
      minimum: 0
    },
    profit_margin: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    stock_quantity: {
      type: 'integer',
      minimum: 0
    },
    unit: {
      type: 'string',
      maxLength: 50
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'draft']
    },
    system_ip: {
      type: 'string',
      maxLength: 45
    }
  },
  additionalProperties: false,
  minProperties: 1
};

export const updateStockSchema = {
  type: 'object',
  required: ['stock_quantity'],
  properties: {
    stock_quantity: {
      type: 'integer',
      minimum: 0
    }
  },
  additionalProperties: false
};

export const productQuerySchema = {
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
    category: {
      type: 'string'
    },
    supplier_id: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    job_id: {
      type: 'string',
      pattern: '^[0-9]+$'
    },
    is_custom: {
      type: 'string',
      enum: ['true', 'false']
    },
    search: {
      type: 'string'
    }
  },
  additionalProperties: false
};
