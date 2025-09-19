import Joi from 'joi';

export const createEstimateSchema = Joi.object({
  job_id: Joi.number().integer().positive().optional(),
  estimate_title: Joi.string().max(200).required(),
  customer_id: Joi.number().integer().positive().required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  valid_until: Joi.date().optional(),
  location: Joi.string().max(200).optional(),
  description: Joi.string().optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').required(),
  email_address: Joi.string().email().required(),
  estimate_date: Joi.date().required(),
  
  // Cost breakdown
  materials_cost: Joi.number().precision(2).min(0).default(0),
  labor_cost: Joi.number().precision(2).min(0).default(0),
  additional_costs: Joi.number().precision(2).min(0).default(0),
  subtotal: Joi.number().precision(2).min(0).default(0),
  tax_percentage: Joi.number().precision(2).min(0).max(100).default(8.00),
  tax_amount: Joi.number().precision(2).min(0).default(0),
  total_amount: Joi.number().precision(2).min(0).default(0),
  
  // Status
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').default('draft')
});

export const updateEstimateSchema = Joi.object({
  job_id: Joi.number().integer().positive().optional(),
  estimate_title: Joi.string().max(200).optional(),
  customer_id: Joi.number().integer().positive().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  valid_until: Joi.date().optional(),
  location: Joi.string().max(200).optional(),
  description: Joi.string().optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').optional(),
  email_address: Joi.string().email().optional(),
  estimate_date: Joi.date().optional(),
  
  // Cost breakdown
  materials_cost: Joi.number().precision(2).min(0).optional(),
  labor_cost: Joi.number().precision(2).min(0).optional(),
  additional_costs: Joi.number().precision(2).min(0).optional(),
  subtotal: Joi.number().precision(2).min(0).optional(),
  tax_percentage: Joi.number().precision(2).min(0).max(100).optional(),
  tax_amount: Joi.number().precision(2).min(0).optional(),
  total_amount: Joi.number().precision(2).min(0).optional(),
  
  // Status
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').optional()
});

export const estimateQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('id', 'estimate_title', 'estimate_date', 'total_amount', 'status', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  
  // Filters
  job_id: Joi.number().integer().positive().optional(),
  customer_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  service_type: Joi.string().valid('service_based', 'contract_based').optional(),
  estimate_date: Joi.date().optional()
});

// Additional Cost Schemas
export const createAdditionalCostSchema = Joi.object({
  estimate_id: Joi.number().integer().positive().required(),
  description: Joi.string().max(200).required(),
  amount: Joi.number().precision(2).min(0).required()
});

export const updateAdditionalCostSchema = Joi.object({
  description: Joi.string().max(200).optional(),
  amount: Joi.number().precision(2).min(0).optional()
});