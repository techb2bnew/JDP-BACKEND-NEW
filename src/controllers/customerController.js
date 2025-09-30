import { CustomerService } from '../services/customerService.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class CustomerController {
  static async createCustomer(request, reply) {
    try {
      const userId = request.user.id; 
      const result = await CustomerService.createCustomer(request.body, userId);
      return reply.code(201).send(result);
    } catch (error) {

      
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to create customer: ${error.message}`));
    }
  }

  static async getCustomers(request, reply) {
    try {
      const { page, limit, search, status, sortBy, sortOrder } = request.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc'
      };

      const result = await CustomerService.getCustomers(filters, pagination);
      return reply.code(200).send(result);
    } catch (error) {

      
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get customers: ${error.message}`));
    }
  }

  static async getCustomerById(request, reply) {
    try {
      const { id } = request.params;
      const result = await CustomerService.getCustomerById(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get customer: ${error.message}`));
    }
  }

  static async updateCustomer(request, reply) {
    try {
      const { id } = request.params;
      const result = await CustomerService.updateCustomer(parseInt(id), request.body);
      return reply.code(200).send(result);
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to update customer: ${error.message}`));
    }
  }

  static async deleteCustomer(request, reply) {
    try {
      const { id } = request.params;
      const result = await CustomerService.deleteCustomer(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {

      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to delete customer: ${error.message}`));
    }
  }

  static async getCustomerStats(request, reply) {
    try {
      const result = await CustomerService.getCustomerStats();
      return reply.code(200).send(result);
    } catch (error) {

      
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get customer stats: ${error.message}`));
    }
  }
}
