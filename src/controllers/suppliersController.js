import { SuppliersService } from '../services/suppliersService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class suppliersController {
  static async createSupplier(req, reply) {
    try {
      const supplierData = req.body;

      try {
        SuppliersService.validateSupplierData(supplierData);
      } catch (validationError) {
        return reply.status(400).send(validationErrorResponse([validationError.message]));
      }

      const result = await SuppliersService.createSuppliersWithUser(supplierData);
      
      return reply.status(201).send(successResponse(result, 'Supplier created successfully', 201));
    } catch (error) {

      
      if (error.message === 'Email already exists') {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      
      if (error.message === 'Supplier code already exists') {
        return reply.status(400).send(errorResponse('Supplier code already exists', 400));
      }
      
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('suppliers_supplier_code_key')) {
          return reply.status(400).send(errorResponse('Supplier code already exists', 400));
        }
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      
      return reply.status(500).send(errorResponse('Failed to create supplier', 500));
    }
  }

  static async getAllSuppliers(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (page < 1) {
        return reply.status(400).send(errorResponse('Page must be greater than 0', 400));
      }
      if (limit < 1 || limit > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }
      
      const result = await SuppliersService.getAllSuppliers(page, limit);
      
      return reply.status(200).send(successResponse(result, 'Suppliers retrieved successfully'));
    } catch (error) {
     
      return reply.status(500).send(errorResponse(`Failed to retrieve suppliers: ${error.message}`, 500));
    }
  }

  static async searchSuppliers(req, reply) {
    try {
      const { 
        q, 
        page, 
        limit, 
        name, 
        email, 
        company, 
        contact, 
        status
      } = req.query;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const filters = {
        q: q || '',
        name,
        email,
        company,
        contact,
        status
      };

      const result = await SuppliersService.searchSuppliers(filters, pagination);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send(errorResponse(
        `Failed to search suppliers: ${error.message}`,
        500
      ));
    }
  }

  static async getSupplierById(req, reply) {
    try {
      const { supplierId } = req.params;
      const { page = '1', limit = '10' } = req.query || {};

      if (!supplierId) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID is required']));
      }

      const supplierIdNum = parseInt(supplierId);
      if (isNaN(supplierIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID must be a valid number']));
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (Number.isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send(validationErrorResponse(['page must be a positive integer']));
      }

      if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send(validationErrorResponse(['limit must be between 1 and 100']));
      }

      const supplier = await SuppliersService.getSupplierById(supplierIdNum, pageNum, limitNum);
      
      return reply.status(200).send(successResponse(supplier, 'Supplier retrieved successfully'));
    } catch (error) {
     
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Supplier not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to retrieve supplier: ${error.message}`, 500));
    }
  }

  static async updateSupplier(req, reply) {
    try {
      const { supplierId } = req.params;
      const updateData = req.body;

      if (!supplierId) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID is required']));
      }

      const supplierIdNum = parseInt(supplierId);
      if (isNaN(supplierIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const updatedSupplier = await SuppliersService.updateSupplier(supplierIdNum, updateData);
      
      return reply.status(200).send(successResponse(updatedSupplier, 'Supplier updated successfully'));
    } catch (error) {
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Supplier not found', 404));
      }
      if (error.message === 'Email already exists') {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      if (error.message === 'Supplier code already exists') {
        return reply.status(400).send(errorResponse('Supplier code already exists', 400));
      }
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('suppliers_supplier_code_key')) {
          return reply.status(400).send(errorResponse('Supplier code already exists', 400));
        }
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse(`Failed to update supplier: ${error.message}`, 500));
    }
  }

  static async deleteSupplier(req, reply) {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID is required']));
      }

      const supplierIdNum = parseInt(supplierId);
      if (isNaN(supplierIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Supplier ID must be a valid number']));
      }

      const result = await SuppliersService.deleteSupplier(supplierIdNum);
      
      return reply.status(200).send(successResponse(result, 'Supplier deleted successfully'));
    } catch (error) {
     
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Supplier not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to delete supplier: ${error.message}`, 500));
    }
  }
}
