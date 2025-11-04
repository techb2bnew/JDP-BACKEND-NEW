import { Customer } from "../models/Customer.js";
import { successResponse } from "../helpers/responseHelper.js";

export class CustomerService {
  static async createCustomer(customerData, createdByUserId) {
    try {
      if (customerData.email) {
        const existingCustomer = await Customer.findByEmail(customerData.email);
        if (existingCustomer) {
          throw new Error("Customer with this email already exists");
        }
      }

      const customerWithCreator = {
        ...customerData,
        created_by: createdByUserId
      };

      const customer = await Customer.create(customerWithCreator);

      return successResponse(
        customer,
        "Customer created successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getCustomers(filters, pagination) {
    try {
      const result = await Customer.findAll(filters, pagination);

      return successResponse(
        {
          customers: result.customers,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Customers retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getCustomerById(customerId) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      return successResponse(
        customer,
        "Customer retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateCustomer(customerId, updateData) {
    try {
      const existingCustomer = await Customer.findById(customerId);
      if (!existingCustomer) {
        throw new Error("Customer not found");
      }

      
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const customerWithEmail = await Customer.findByEmail(updateData.email);
        if (customerWithEmail) {
          throw new Error("Customer with this email already exists");
        }
      }

      const updatedCustomer = await Customer.update(customerId, updateData);

      return successResponse(
        updatedCustomer,
        "Customer updated successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async deleteCustomer(customerId) {
    try {
     
      const existingCustomer = await Customer.findById(customerId);
      if (!existingCustomer) {
        throw new Error("Customer not found");
      }

      
      const relationshipCheck = await Customer.checkCustomerRelationships(customerId);
      
      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this customer because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      await Customer.delete(customerId);

      return successResponse(
        null,
        "Customer deleted successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getCustomerStats() {
    try {
      const stats = await Customer.getStats();

      return successResponse(
        stats,
        "Customer statistics retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
