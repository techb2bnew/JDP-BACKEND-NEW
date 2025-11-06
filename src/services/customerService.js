import { Customer } from "../models/Customer.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from "../config/database.js";

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
      // Optimize: Lightweight existence check (only fetch email if needed for comparison)
      if (updateData.email) {
        // If email is being updated, fetch current customer email for comparison
        const { data: currentCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('id, email')
          .eq('id', customerId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentCustomer) {
          throw new Error("Customer not found");
        }

        // Check if new email already exists (only if different from current)
        if (updateData.email !== currentCustomer.email) {
          const customerWithEmail = await Customer.findByEmail(updateData.email);
          if (customerWithEmail) {
            throw new Error("Customer with this email already exists");
          }
        }
      } else {
        // If email is not being updated, just check if customer exists (lightweight)
        const { data: customer, error: fetchError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!customer) {
          throw new Error("Customer not found");
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
      // Optimize: Run existence check and relationship check in parallel
      const [existenceCheck, relationshipCheck] = await Promise.all([
        supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .single(),
        Customer.checkCustomerRelationships(customerId)
      ]);

      if (existenceCheck.error && existenceCheck.error.code !== 'PGRST116') {
        throw new Error(`Database error: ${existenceCheck.error.message}`);
      }

      if (!existenceCheck.data) {
        throw new Error("Customer not found");
      }
      
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
