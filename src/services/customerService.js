import { Customer } from "../models/Customer.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from "../config/database.js";
import {
  createQuickBooksCustomer,
  updateQuickBooksCustomer,
  deleteQuickBooksCustomer,
} from "./quickbooksClient.js";

export class CustomerService {
  static async createCustomer(customerData, createdByUserId) {
    try {
      if (customerData.email) {
        const existingCustomer = await Customer.findByEmail(customerData.email);
        if (existingCustomer) {
          throw new Error("Customer with this email already exists");
        }
      }

      // Pehle QuickBooks me customer create karo
      const qbPayload = {
        DisplayName: customerData.company_name || customerData.customer_name,
        CompanyName: customerData.company_name || undefined,
        GivenName: customerData.customer_name || undefined,
        PrimaryEmailAddr: customerData.email
          ? { Address: customerData.email }
          : undefined,
        PrimaryPhone: customerData.phone
          ? { FreeFormNumber: customerData.phone }
          : undefined,
        BillAddr: customerData.address
          ? { Line1: customerData.address }
          : undefined,
      };

      const qbResponse = await createQuickBooksCustomer(qbPayload);
      const qbCustomer = qbResponse.Customer;
      const qbCustomerId = qbCustomer?.Id;

      const customerWithCreator = {
        ...customerData,
        created_by: createdByUserId,
        qb_customer_id: qbCustomerId || null,
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
      // Hamesha current customer + qb_customer_id pehle nikaal lo
      const { data: currentCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('id, email, qb_customer_id')
        .eq('id', customerId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!currentCustomer) {
        throw new Error("Customer not found");
      }

      // Email change ho rahi hai to uniqueness check
      if (updateData.email && updateData.email !== currentCustomer.email) {
        const customerWithEmail = await Customer.findByEmail(updateData.email);
        if (customerWithEmail) {
          throw new Error("Customer with this email already exists");
        }
      }

      // QuickBooks me bhi update
      if (currentCustomer.qb_customer_id) {
        const qbFields = {
          DisplayName: updateData.company_name || updateData.customer_name,
          CompanyName: updateData.company_name,
          GivenName: updateData.customer_name,
          PrimaryEmailAddr: updateData.email
            ? { Address: updateData.email }
            : undefined,
          PrimaryPhone: updateData.phone
            ? { FreeFormNumber: updateData.phone }
            : undefined,
          BillAddr: updateData.address
            ? { Line1: updateData.address }
            : undefined,
        };

        // Falsy values hata do taki sparse update sahi chale
        Object.keys(qbFields).forEach((key) => {
          if (qbFields[key] === undefined) {
            delete qbFields[key];
          }
        });

        await updateQuickBooksCustomer(currentCustomer.qb_customer_id, qbFields);
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
      const [existenceCheck, relationshipCheck] = await Promise.all([
        supabase
          .from('customers')
          .select('id, qb_customer_id')
          .eq('id', customerId)
          .single(),
        Customer.checkCustomerRelationships(customerId),
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

      // Pehle QuickBooks me customer ko inactive mark karo (agar mapped hai)
      if (existenceCheck.data.qb_customer_id) {
        try {
          await deleteQuickBooksCustomer(existenceCheck.data.qb_customer_id);
        } catch (error) {
          // Agar QuickBooks me inactive mark karne me issue aata hai,
          // to bhi ham local DB se delete karenge, sirf error log karna chahiye.
          // Yaha hum error ko bubble up nahi kar rahe.
          console.error('Failed to inactivate customer in QuickBooks:', error);
        }
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
