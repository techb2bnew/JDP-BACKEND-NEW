import { ProductService } from '../services/productService.js';
import { successResponse, errorResponse } from '../helpers/responseHelper.js';

export class ProductController {
  static async createProduct(request, reply) {
    try {
      const productData = request.body;
      const userId = request.user.id; 
      
      ProductService.validateProductData(productData);

      const result = await ProductService.createProduct(productData, userId);
      
      return reply.status(201).send(successResponse(
        result.product,
        result.message,
        201
      ));
    } catch (error) {

      
      return reply.status(400).send(errorResponse(
        `Failed to create product: ${error.message}`,
        400
      ));
    }
  }

  static async getAllProducts(request, reply) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        supplier_id,
        job_id,
        is_custom,
        status,
        search
      } = request.query;

      const filters = {};
      if (category) filters.category = category;
      if (supplier_id) filters.supplier_id = parseInt(supplier_id);
      if (job_id) filters.job_id = parseInt(job_id);
      if (is_custom) filters.is_custom = is_custom;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const result = await ProductService.getAllProducts(
        parseInt(page),
        parseInt(limit),
        filters
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Products retrieved successfully',
        200
      ));
    } catch (error) {

      
      return reply.status(500).send(errorResponse(
        `Failed to get products: ${error.message}`,
        500
      ));
    }
  }

  static async getCustomProducts(request, reply) {
    try {
      const {
        page = 1,
        limit = 10,
        job_id
      } = request.query;

      const result = await ProductService.getCustomProducts(
        job_id ? parseInt(job_id) : null,
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Custom products retrieved successfully',
        200
      ));
    } catch (error) {

      
      return reply.status(500).send(errorResponse(
        `Failed to get custom products: ${error.message}`,
        500
      ));
    }
  }

  static async getProductsByJob(request, reply) {
    try {
      const { jobId } = request.params;
      const {
        page = 1,
        limit = 10
      } = request.query;

      const result = await ProductService.getProductsByJob(
        parseInt(jobId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Products for job retrieved successfully',
        200
      ));
    } catch (error) {

      
      return reply.status(500).send(errorResponse(
        `Failed to get job products: ${error.message}`,
        500
      ));
    }
  }

  static async getProductById(request, reply) {
    try {
      const { id } = request.params;
      
      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse(
          'Valid product ID is required',
          400
        ));
      }

      const product = await ProductService.getProductById(parseInt(id));
      
      return reply.status(200).send(successResponse(
        product,
        'Product retrieved successfully',
        200
      ));
    } catch (error) {
     
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(
          error.message,
          404
        ));
      }
      
      return reply.status(500).send(errorResponse(
        `Failed to get product: ${error.message}`,
        500
      ));
    }
  }

  static async updateProduct(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse(
          'Valid product ID is required',
          400
        ));
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send(errorResponse(
          'At least one field must be provided for update',
          400
        ));
      }

      const updatedProduct = await ProductService.updateProduct(parseInt(id), updateData);
      
      return reply.status(200).send(successResponse(
        updatedProduct,
        'Product updated successfully',
        200
      ));
    } catch (error) {
 
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(
          error.message,
          404
        ));
      }
      
      return reply.status(400).send(errorResponse(
        `Failed to update product: ${error.message}`,
        400
      ));
    }
  }

  static async deleteProduct(request, reply) {
    try {
      const { id } = request.params;
      
      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse(
          'Valid product ID is required',
          400
        ));
      }

      const result = await ProductService.deleteProduct(parseInt(id));
      
      return reply.status(200).send(successResponse(
        result.deleted_product,
        result.message,
        200
      ));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(
          error.message,
          404
        ));
      }
      
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getProductsBySupplier(request, reply) {
    try {
      const { supplierId } = request.params;
      const { page = 1, limit = 10 } = request.query;
      
      if (!supplierId || isNaN(supplierId)) {
        return reply.status(400).send(errorResponse(
          'Valid supplier ID is required',
          400
        ));
      }

      const result = await ProductService.getProductsBySupplier(
        parseInt(supplierId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Products retrieved successfully',
        200
      ));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(
          error.message,
          404
        ));
      }
      
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getProductCategories(request, reply) {
    try {
      const categories = await ProductService.getProductCategories();
      
      return reply.status(200).send(successResponse(
        { categories },
        'Product categories retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async updateStock(request, reply) {
    try {
      const { id } = request.params;
      const { stock_quantity } = request.body;
      
      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse(
          'Valid product ID is required',
          400
        ));
      }

      if (stock_quantity === undefined || stock_quantity === null || stock_quantity < 0) {
        return reply.status(400).send(errorResponse(
          'Valid stock quantity is required (non-negative number)',
          400
        ));
      }

      const result = await ProductService.updateStock(parseInt(id), { stock_quantity });
      
      return reply.status(200).send(successResponse(
        result.product,
        result.message,
        200
      ));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(
          error.message,
          404
        ));
      }
      
      return reply.status(400).send(errorResponse(
        error.message,
        400
      ));
    }
  }

  static async getLowStockProducts(request, reply) {
    try {
      const { threshold = 10 } = request.query;
      
      if (isNaN(threshold) || threshold < 0) {
        return reply.status(400).send(errorResponse(
          'Valid threshold is required (non-negative number)',
          400
        ));
      }

      const result = await ProductService.getLowStockProducts(parseInt(threshold));
      
      return reply.status(200).send(successResponse(
        result,
        'Low stock products retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async calculatePricing(request, reply) {
    try {
      const { cost_price, markup_percentage } = request.body;
      
      if (!cost_price || !markup_percentage) {
        return reply.status(400).send(errorResponse(
          'Cost price and markup percentage are required',
          400
        ));
      }

      if (cost_price < 0 || markup_percentage < 0 || markup_percentage > 100) {
        return reply.status(400).send(errorResponse(
          'Cost price must be non-negative and markup percentage must be between 0 and 100',
          400
        ));
      }

      const pricing = await ProductService.calculateProductPricing(cost_price, markup_percentage);
      
      return reply.status(200).send(successResponse(
        pricing,
        'Pricing calculated successfully',
        200
      ));
    } catch (error) {
      return reply.status(400).send(errorResponse(
        error.message,
        400
      ));
    }
  }

  static async getProductStatistics(request, reply) {
    try {
      const statistics = await ProductService.getProductStatistics();
      
      return reply.status(200).send(successResponse(
        statistics,
        'Product statistics retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getProductStats(request, reply) {
    try {
      const result = await ProductService.getProductStats();
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }
}
