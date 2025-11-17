import Joi from 'joi';

export const createBluesheetSchema = Joi.object({
  job_id: Joi.number().integer().required(),
  date: Joi.date().required(),
  notes: Joi.string().allow('', null).optional(),
  additional_charges: Joi.number().precision(2).min(0).optional(),
});

export const updateBluesheetSchema = Joi.object({
  date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional(),
  additional_charges: Joi.number().precision(2).min(0).optional(),
});

export const addLaborEntrySchema = Joi.object({
  labor_id: Joi.number().integer().optional(),
  lead_labor_id: Joi.number().integer().optional(),
  employee_name: Joi.string().required(),
  role: Joi.string().optional(),
  regular_hours: Joi.string().optional(),
  overtime_hours: Joi.string().optional(),
  hourly_rate: Joi.number().precision(2).optional()
}).custom((value, helpers) => {
 
  if (!value.labor_id && !value.lead_labor_id) {
    return helpers.error('custom.laborRequired');
  }
  return value;
}).messages({
  'custom.laborRequired': 'Either labor_id or lead_labor_id is required'
});

export const updateLaborEntrySchema = Joi.object({
  employee_name: Joi.string().optional(),
  role: Joi.string().optional(),
  regular_hours: Joi.string().optional(),
  overtime_hours: Joi.string().optional(),
  hourly_rate: Joi.number().precision(2).optional(),
});

export const addMaterialEntrySchema = Joi.object({
  product_id: Joi.number().integer().optional(),
  material_name: Joi.string().required(),
  unit: Joi.string().optional(),
  total_ordered: Joi.number().integer().min(0).optional(),
  material_used: Joi.number().integer().min(0).optional(),
  supplier_order_id: Joi.string().allow('', null).optional(),
  return_to_warehouse: Joi.boolean().optional(),
  unit_cost: Joi.number().precision(2).optional()
});

export const updateMaterialEntrySchema = Joi.object({
  material_name: Joi.string().optional(),
  unit: Joi.string().optional(),
  total_ordered: Joi.number().integer().min(0).optional(),
  material_used: Joi.number().integer().min(0).optional(),
  supplier_order_id: Joi.string().allow('', null).optional(),
  return_to_warehouse: Joi.boolean().optional(),
  unit_cost: Joi.number().precision(2).optional(),
});

export const searchBluesheetSchema = Joi.object({
  job_id: Joi.number().integer().optional(),
  date: Joi.date().optional(),
  created_by: Joi.number().integer().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
});

export const materialUsageStatsSchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().required()
});

export const updateAdditionalChargesSchema = Joi.object({
  additional_charges: Joi.number().precision(2).min(0).required()
});

export const createCompleteBluesheetSchema = Joi.object({
  job_id: Joi.number().integer().required(),
  date: Joi.date().required(),
  notes: Joi.string().allow('', null).optional(),
  additional_charges: Joi.number().precision(2).min(0).optional(),
  labor_entries: Joi.array().items(
    Joi.object({
      labor_id: Joi.number().integer().optional(),
      lead_labor_id: Joi.number().integer().optional(),
      employee_name: Joi.string().required(),
      role: Joi.string().optional(),
      regular_hours: Joi.string().optional(),
      overtime_hours: Joi.string().optional(),
      hourly_rate: Joi.number().precision(2).optional()
    })
  ).optional(),
  material_entries: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().optional(),
      material_name: Joi.string().required(),
      quantity: Joi.number().precision(2).min(0).optional(),
      unit: Joi.string().optional(),
      total_ordered: Joi.number().integer().min(0).optional(),
      material_used: Joi.number().integer().min(0).optional(),
      supplier_order_id: Joi.string().allow('', null).optional(),
      return_to_warehouse: Joi.boolean().optional(),
      unit_cost: Joi.number().precision(2).optional()
    })
  ).optional()
});
