import Joi from "joi";

export const createOrderSchema = Joi.object({
  customer_id: Joi.number().integer().optional().allow(null),
  contractor_id: Joi.number().integer().optional().allow(null),
  job_id: Joi.number().integer().optional().allow(null),
  supplier_id: Joi.number().integer().optional().allow(null),
  lead_labour_id: Joi.number().integer().optional().allow(null),
  
  order_date: Joi.date().optional(),
  delivery_date: Joi.date().optional(),
  
  delivery_address: Joi.string().max(500).optional().allow(null, ''),
  delivery_city_zip: Joi.string().max(100).optional().allow(null, ''),
  delivery_phone: Joi.string().max(20).optional().allow(null, ''),
  delivery_notes: Joi.string().max(1000).optional().allow(null, ''),
  
  tax_amount: Joi.number().min(0).default(0).optional(),
  discount_amount: Joi.number().min(0).default(0).optional(),
  
  status: Joi.string()
    .valid('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'completed')
    .default('pending')
    .optional(),
  payment_status: Joi.string()
    .valid('unpaid', 'partial', 'paid', 'refunded')
    .default('unpaid')
    .optional(),
  payment_method: Joi.string().max(50).optional().allow(null, ''),
  
  notes: Joi.string().max(2000).optional().allow(null, ''),
  internal_notes: Joi.string().max(2000).optional().allow(null, ''),
  
  cartItems: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required in cart',
      'any.required': 'Cart items are required'
    })
});

export const updateOrderSchema = Joi.object({
  customer_id: Joi.number().integer().optional().allow(null),
  contractor_id: Joi.number().integer().optional().allow(null),
  job_id: Joi.number().integer().optional().allow(null),
  supplier_id: Joi.number().integer().optional().allow(null),
  lead_labour_id: Joi.number().integer().optional().allow(null),
  
  order_date: Joi.date().optional(),
  delivery_date: Joi.date().optional(),
  
  delivery_address: Joi.string().max(500).optional().allow(null, ''),
  delivery_city_zip: Joi.string().max(100).optional().allow(null, ''),
  delivery_phone: Joi.string().max(20).optional().allow(null, ''),
  delivery_notes: Joi.string().max(1000).optional().allow(null, ''),
  
  tax_amount: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  
  status: Joi.string()
    .valid('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'completed')
    .optional(),
  payment_status: Joi.string()
    .valid('unpaid', 'partial', 'paid', 'refunded')
    .optional(),
  payment_method: Joi.string().max(50).optional().allow(null, ''),
  
  notes: Joi.string().max(2000).optional().allow(null, ''),
  internal_notes: Joi.string().max(2000).optional().allow(null, ''),

  cartItems: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one item is required in cart'
    })
}).min(1);

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'completed')
    .required()
});

export const updatePaymentStatusSchema = Joi.object({
  payment_status: Joi.string()
    .valid('unpaid', 'partial', 'paid', 'refunded')
    .required(),
  payment_method: Joi.string().max(50).optional().allow(null, '')
});

export const addOrderItemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required()
});
