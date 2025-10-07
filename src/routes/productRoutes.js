import { ProductController } from '../controllers/productController.js';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productQuerySchema
} from '../validations/productValidation.js';

export default async function productRoutes(fastify, options) {
  fastify.post('/createProduct', {
    preHandler: [fastify.authenticateToken],
  }, ProductController.createProduct);

  fastify.get('/getAllProducts', {
    preHandler: [fastify.authenticateToken],
  }, ProductController.getAllProducts);

  fastify.get('/getCustomProducts', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', pattern: '^[0-9]+$' },
          limit: { type: 'string', pattern: '^[0-9]+$' },
          job_id: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, ProductController.getCustomProducts);

  fastify.get('/getProductsByJob/:jobId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['jobId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', pattern: '^[0-9]+$' },
          limit: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, ProductController.getProductsByJob);

  fastify.get('/getProductById/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                product_name: { type: 'string' },
                category: { type: 'string' },
                supplier_id: { type: 'integer' },
                description: { type: 'string' },
                supplier_sku: { type: 'string' },
                jdp_sku: { type: 'string' },
                supplier_cost_price: { type: 'number' },
                markup_percentage: { type: 'number' },
                markup_amount: { type: 'number' },
                jdp_price: { type: 'number' },
                profit_margin: { type: 'number' },
                stock_quantity: { type: 'integer' },
                unit: { type: 'string' },
                status: { type: 'string' },
                system_ip: { type: 'string' },
                created_by: { type: 'integer' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
                created_by_user: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'integer' },
                    full_name: { type: 'string' },
                    email: { type: 'string' }
                  }
                },
                suppliers: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'integer' },
                    user_id: { type: 'integer' },
                    supplier_code: { type: 'string' },
                    company_name: { type: 'string' },
                    contact_person: { type: 'string' },
                    address: { type: 'string' },
                    contract_start: { type: 'string' },
                    contract_end: { type: 'string' },
                    notes: { type: 'string' },
                    created_at: { type: 'string' },
                    users: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        full_name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        role: { type: 'string' },
                        status: { type: 'string' },
                        photo_url: { type: 'string' },
                        created_at: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, ProductController.getProductById);

  fastify.post('/updateProduct/:id', {
    preHandler: [fastify.authenticateToken],
  }, ProductController.updateProduct);

  fastify.delete('/deleteProduct/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                product_name: { type: 'string' },
                jdp_sku: { type: 'string' },
                category: { type: 'string' }
              }
            },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, ProductController.deleteProduct);

  fastify.get('/getProductsBySupplier/:supplierId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          supplierId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['supplierId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', pattern: '^[0-9]+$' },
          limit: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, ProductController.getProductsBySupplier);

  
  fastify.get('/categories/list', {
    preHandler: [fastify.authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, ProductController.getProductCategories);

  
  fastify.patch('/:id/stock', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      },
      body: updateStockSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                product_name: { type: 'string' },
                stock_quantity: { type: 'integer' },
                updated_at: { type: 'string' }
              }
            },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, ProductController.updateStock);


  fastify.get('/low-stock/list', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          threshold: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, ProductController.getLowStockProducts);

  fastify.post('/calculate-pricing', {
    preHandler: [fastify.authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['cost_price', 'markup_percentage'],
        properties: {
          cost_price: { type: 'number', minimum: 0 },
          markup_percentage: { type: 'number', minimum: 0, maximum: 100 }
        },
        additionalProperties: false
      }
    }
  }, ProductController.calculatePricing);


  fastify.get('/statistics/overview', {
    preHandler: [fastify.authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                total_products: { type: 'integer' },
                total_stock_value: { type: 'number' },
                low_stock_count: { type: 'integer' },
                total_categories: { type: 'integer' },
                categories: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, ProductController.getProductStatistics);

  
  fastify.get('/getProductStats/stats', {
    preHandler: [fastify.authenticateToken],
    handler: ProductController.getProductStats
  });

  fastify.get('/searchProducts', {
    preHandler: [fastify.authenticateToken],
    handler: ProductController.searchProducts
  });
}
