import Joi from 'joi';

export const createEstimateSchema = Joi.object({
  job_id: Joi.number().integer().positive().optional(),
  estimate_title: Joi.string().max(200).required(),
  customer_id: Joi.number().integer().positive().optional(),
  contractor_id: Joi.number().integer().positive().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  valid_until: Joi.date().optional(),
  location: Joi.string().max(200).optional(),
  description: Joi.string().allow('').optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').required(),
  email_address: Joi.string().email().required(),
  estimate_date: Joi.date().required(),
  billing_address_po_number: Joi.string().max(100).optional(),
  total_amount: Joi.number().precision(2).min(0).default(0),
  
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').default('draft'),
  

  invoice_type: Joi.string().valid('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment').default('estimate'),
  invoice_number: Joi.string().max(50).optional(),
  issue_date: Joi.date().optional(),
  due_date: Joi.date().optional(),
  
 
  additional_cost: Joi.object({
    description: Joi.string().max(200).required(),
    amount: Joi.number().precision(2).min(0).required()
  }).optional(),

  // Custom products array
  custom_products: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().positive().optional(),
      product_id: Joi.number().integer().positive().optional(),
      product_name: Joi.string().max(200).required(),
      supplier_id: Joi.number().integer().positive().required(),
      supplier_sku: Joi.string().max(100).optional(),
      jdp_sku: Joi.string().max(100).optional(),
      stock_quantity: Joi.number().integer().min(0).required(),
      unit: Joi.string().max(50).required(),
      job_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
      is_custom: Joi.boolean().default(true),
      unit_cost: Joi.number().precision(2).min(0).required(),
      jdp_price: Joi.number().precision(2).min(0).optional(),
      estimated_price: Joi.number().precision(2).min(0).optional(),
      total_cost: Joi.number().precision(2).min(0).optional()
    })
  ).optional()
}).or('customer_id', 'contractor_id'); // At least one of customer_id or contractor_id is required

export const updateEstimateSchema = Joi.object({
  job_id: Joi.number().integer().positive().optional(),
  estimate_title: Joi.string().max(200).optional(),
  customer_id: Joi.number().integer().positive().optional(),
  contractor_id: Joi.number().integer().positive().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  valid_until: Joi.date().optional(),
  location: Joi.string().max(200).optional(),
  description: Joi.string().allow('').optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').optional(),
  email_address: Joi.string().email().optional(),
  estimate_date: Joi.date().optional(),
  billing_address_po_number: Joi.string().max(100).optional(),
  total_amount: Joi.number().precision(2).min(0).optional(),

  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').optional(),
  
  invoice_type: Joi.string().valid('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment').optional(),
  invoice_number: Joi.string().max(50).optional(),
  issue_date: Joi.date().optional(),
  due_date: Joi.date().optional(),
  
  additional_cost: Joi.object({
    description: Joi.string().max(200).required(),
    amount: Joi.number().precision(2).min(0).required()
  }).optional(),

  // Custom products array for updates
  custom_products: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().positive().optional(),
      product_id: Joi.number().integer().positive().optional(),
      product_name: Joi.string().max(200).required(),
      supplier_id: Joi.number().integer().positive().required(),
      supplier_sku: Joi.string().max(100).optional(),
      jdp_sku: Joi.string().max(100).optional(),
      stock_quantity: Joi.number().integer().min(0).required(),
      unit: Joi.string().max(50).required(),
      job_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
      is_custom: Joi.boolean().default(true),
      unit_cost: Joi.number().precision(2).min(0).required(),
      jdp_price: Joi.number().precision(2).min(0).optional(),
      estimated_price: Joi.number().precision(2).min(0).optional(),
      total_cost: Joi.number().precision(2).min(0).optional()
    })
  ).optional()
});

export const estimateQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('id', 'estimate_title', 'estimate_date', 'total_amount', 'status', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  
  job_id: Joi.number().integer().positive().optional(),
  customer_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').optional(),
  estimate_date: Joi.date().optional()
});

export const createAdditionalCostSchema = Joi.object({
  estimate_id: Joi.number().integer().positive().required(),
  description: Joi.string().max(200).required(),
  amount: Joi.number().precision(2).min(0).required()
});

export const updateAdditionalCostSchema = Joi.object({
  description: Joi.string().max(200).optional(),
  amount: Joi.number().precision(2).min(0).optional()
});