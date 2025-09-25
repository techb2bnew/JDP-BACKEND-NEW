import { supabase } from '../config/database.js';

export class Estimate {
  static async generateInvoiceNumber() {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number');
      
      if (error) {
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;
        
        const { data: lastInvoice, error: fetchError } = await supabase
          .from('estimates')
          .select('invoice_number')
          .like('invoice_number', prefix + '%')
          .order('invoice_number', { ascending: false })
          .limit(1);
        
        if (fetchError) {
          throw new Error(`Database error: ${fetchError.message}`);
        }
        
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.length > 0) {
          const lastNumber = lastInvoice[0].invoice_number;
          const match = lastNumber.match(new RegExp(`${prefix}(\\d+)`));
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async create(estimateData) {
    try {
      const additionalCost = estimateData.additional_cost;
      delete estimateData.additional_cost; 

      if (!estimateData.invoice_number) {
        estimateData.invoice_number = await Estimate.generateInvoiceNumber();
      }

      const { data, error } = await supabase
        .from("estimates")
        .insert([estimateData])
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (additionalCost && additionalCost.description && additionalCost.amount) {
        const additionalCostData = {
          estimate_id: data.id,
          description: additionalCost.description,
          amount: additionalCost.amount,
          created_by: estimateData.created_by || null,
          system_ip: estimateData.system_ip || null
        };

        const { error: additionalCostError } = await supabase
          .from("estimate_additional_costs")
          .insert([additionalCostData]);

        if (additionalCostError) {
          console.error('Error creating additional cost:', additionalCostError);
        }
      }

      const { data: completeEstimate, error: fetchError } = await supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          ),
          additional_cost:estimate_additional_costs(
            id,
            description,
            amount,
            created_at
          )
        `)
        .eq('id', data.id)
        .single();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      return completeEstimate;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.service_type) {
        query = query.eq("service_type", filters.service_type);
      }
      if (filters.estimate_date) {
        query = query.eq("estimate_date", filters.estimate_date);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        estimates: data || [],
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async findById(estimateId) {
    try {
      console.log(`Fetching estimate with ID: ${estimateId}`);
      
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Database error in findById:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.log(`No estimate found with ID: ${estimateId}`);
        return null;
      }

      console.log(`Estimate found: ${data.id}, Job ID: ${data.job_id}`);

      // Get related data separately
      let jobData = null;
      let customerData = null;
      let userData = null;

      try {
        if (data.job_id) {
          console.log(`Fetching job data for job_id: ${data.job_id}`);
          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", parseInt(data.job_id))
            .single();
          
          if (jobError) {
            console.error("Job query error:", jobError);
          } else {
            console.log("Job data found:", job);
            jobData = job;
          }
        } else {
          console.log("No job_id found in estimate data");
        }
      } catch (error) {
        console.error("Error fetching job data:", error);
      }

      try {
        if (data.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("id, customer_name, company_name, email, phone, address")
            .eq("id", data.customer_id)
            .single();
          if (!customerError) customerData = customer;
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }

      try {
        if (data.created_by) {
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .eq("id", data.created_by)
            .single();
          if (!userError) userData = user;
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }

      // Get additional costs
      let additionalCosts = [];
      try {
        additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      } catch (error) {
        console.error("Error fetching additional costs:", error);
        additionalCosts = [];
      }
      
      // Get products/materials for this job
      let products = [];
      try {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            product_name,
            description,
            jdp_sku,
            supplier_sku,
            jdp_price,
            stock_quantity,
            unit,
            supplier_id
          `)
          .eq("job_id", parseInt(data.job_id))
          .eq("status", "active");

        if (productsError) {
          console.error("Error fetching products:", productsError);
        } else {
          products = productsData || [];
        }
      } catch (error) {
        console.error("Error in products query:", error);
        products = [];
      }

      // Get labor details for this job
      let laborDetails = [];
      try {
        console.log(`Fetching labor data for job_id: ${data.job_id}`);
        
        // First, get labor assigned directly via job_id (includes custom labor)
        const { data: directLaborData, error: directLaborError } = await supabase
          .from("labor")
          .select(`
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            hours_worked,
            user_id,
            is_custom
          `)
          .eq("job_id", parseInt(data.job_id));

        if (directLaborError) {
          console.error("Error fetching direct labor:", directLaborError);
        }

        // Second, get labor assigned via assigned_labor_ids from job
        let assignedLaborData = [];
        if (jobData && jobData.assigned_labor_ids) {
          try {
            const assignedLaborIds = JSON.parse(jobData.assigned_labor_ids);
            console.log(`Fetching assigned labor IDs: ${assignedLaborIds}`);
            
            if (Array.isArray(assignedLaborIds) && assignedLaborIds.length > 0) {
              const { data: assignedLabor, error: assignedError } = await supabase
                .from("labor")
                .select(`
                  id,
                  labor_code,
                  trade,
                  experience,
                  hourly_rate,
                  hours_worked,
                  user_id,
                  is_custom
                `)
                .in("id", assignedLaborIds);

              if (assignedError) {
                console.error("Error fetching assigned labor:", assignedError);
              } else {
                assignedLaborData = assignedLabor || [];
                console.log("Assigned labor data found:", assignedLaborData);
              }
            }
          } catch (parseError) {
            console.error("Error parsing assigned_labor_ids:", parseError);
          }
        }

        // Combine both direct and assigned labor
        laborDetails = [...(directLaborData || []), ...assignedLaborData];
        console.log("Total labor data found:", laborDetails);
        
      } catch (error) {
        console.error("Error in labor query:", error);
        laborDetails = [];
      }

      // Calculate totals
      const materialsCost = parseFloat(data.materials_cost) || 0;
      const laborCost = parseFloat(data.labor_cost) || 0;
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);
      
      const subtotal = materialsCost + laborCost + additionalCostsTotal;
      const taxAmount = (subtotal * (parseFloat(data.tax_percentage) || 0)) / 100;
      const totalAmount = subtotal + taxAmount;

      // Return enhanced data with detailed breakdown
      return {
        ...data,
        job: jobData,
        customer: customerData,
        created_by_user: userData,
        additional_costs_list: additionalCosts,
        materials_cost: materialsCost,
        labor_cost: laborCost,
        additional_costs: additionalCostsTotal,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        
        // Detailed breakdown like invoice
        items_materials: products.map(product => ({
          id: product.id,
          sku: product.jdp_sku || product.supplier_sku || `PROD-${product.id}`,
          description: product.product_name,
          unit_description: product.description,
          quantity: product.stock_quantity || 1,
          unit_price: parseFloat(product.jdp_price) || 0,
          total: (product.stock_quantity || 1) * (parseFloat(product.jdp_price) || 0),
          unit: product.unit,
          supplier_id: product.supplier_id
        })),
        
        labor_breakdown: laborDetails.map(labor => ({
          id: labor.id,
          labor_code: labor.labor_code,
          labor_name: 'Labor Worker', // Will need to fetch user details separately if needed
          description: `${labor.trade} - ${labor.experience}`,
          hours: parseFloat(labor.hours_worked) || 0,
          rate: parseFloat(labor.hourly_rate) || 0,
          total: (parseFloat(labor.hours_worked) || 0) * (parseFloat(labor.hourly_rate) || 0),
          user_id: labor.user_id,
          is_custom: labor.is_custom || false,
          labor_type: labor.is_custom ? 'Custom Labor' : 'Regular Labor'
        })),
        
        // Invoice formatting
        invoice_details: {
          invoice_number: data.invoice_number,
          issue_date: data.issue_date,
          due_date: data.due_date,
          valid_until: data.valid_until,
          status: data.status,
          invoice_type: data.invoice_type
        },
        
        // Summary of charges (like invoice)
        summary_of_charges: {
          materials_subtotal: materialsCost,
          labor_subtotal: laborCost,
          additional_costs_subtotal: additionalCostsTotal,
          subtotal: subtotal,
          tax_percentage: parseFloat(data.tax_percentage) || 0,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          formatted_totals: {
            materials: `$${materialsCost.toFixed(2)}`,
            labor: `$${laborCost.toFixed(2)}`,
            additional_costs: `$${additionalCostsTotal.toFixed(2)}`,
            subtotal: `$${subtotal.toFixed(2)}`,
            tax: `$${taxAmount.toFixed(2)} (${parseFloat(data.tax_percentage) || 0}%)`,
            total: `$${totalAmount.toFixed(2)}`
          }
        },
        
        // Payment terms and notes (like invoice)
        payment_terms: {
          notes: "Payment received in full. Thank you for your business.",
          terms: "Payment is due within 14 days of invoice date. Late payments may be subject to a 1.5% monthly service charge.",
          thank_you_message: "Thank you for your business!"
        },
        
        // Complete job details
        complete_job_details: jobData ? {
          id: jobData.id,
          job_title: jobData.job_title,
          job_type: jobData.job_type,
          customer_id: jobData.customer_id,
          contractor_id: jobData.contractor_id,
          description: jobData.description,
          priority: jobData.priority,
          address: jobData.address,
          city_zip: jobData.city_zip,
          phone: jobData.phone,
          email: jobData.email,
          bill_to_address: jobData.bill_to_address,
          bill_to_city_zip: jobData.bill_to_city_zip,
          bill_to_phone: jobData.bill_to_phone,
          bill_to_email: jobData.bill_to_email,
          same_as_address: jobData.same_as_address,
          due_date: jobData.due_date,
          estimated_hours: jobData.estimated_hours,
          estimated_cost: jobData.estimated_cost,
          assigned_lead_labor_ids: jobData.assigned_lead_labor_ids,
          assigned_labor_ids: jobData.assigned_labor_ids,
          assigned_material_ids: jobData.assigned_material_ids,
          status: jobData.status,
          created_by: jobData.created_by,
          created_from: jobData.created_from,
          total_work_time: jobData.total_work_time,
          work_activity: jobData.work_activity,
          start_timer: jobData.start_timer,
          end_timer: jobData.end_timer,
          pause_timer: jobData.pause_timer ? JSON.parse(jobData.pause_timer) : [],
          created_at: jobData.created_at,
          updated_at: jobData.updated_at
        } : null
      };
    } catch (error) {
      console.error("Error in Estimate.findById:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  static async update(estimateId, updateData) {
    try {
     
      const additionalCost = updateData.additional_cost;
      delete updateData.additional_cost; 

     
      const { data, error } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("id", estimateId)
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      
      if (additionalCost !== undefined) {
        
        const { error: deleteError } = await supabase
          .from("estimate_additional_costs")
          .delete()
          .eq("estimate_id", estimateId);

        if (deleteError) {
          console.error('Error deleting existing additional cost:', deleteError);
        }

       
        if (additionalCost && additionalCost.description && additionalCost.amount) {
          const additionalCostData = {
            estimate_id: estimateId,
            description: additionalCost.description,
            amount: additionalCost.amount,
            created_by: updateData.created_by || null,
            system_ip: updateData.system_ip || null
          };

          const { error: additionalCostError } = await supabase
            .from("estimate_additional_costs")
            .insert([additionalCostData]);

          if (additionalCostError) {
            console.error('Error creating additional cost:', additionalCostError);
          }
        }
      }

      
      const { data: completeEstimate, error: fetchError } = await supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          ),
          additional_cost:estimate_additional_costs(
            id,
            description,
            amount,
            created_at
          )
        `)
        .eq('id', estimateId)
        .single();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      return completeEstimate;
    } catch (error) {
      throw error;
    }
  }

  static async delete(estimateId) {
    try {
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalEstimates, error: totalError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: draftEstimates, error: draftError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "draft");

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      const { data: sentEstimates, error: sentError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "sent");

      if (sentError) {
        throw new Error(`Database error: ${sentError.message}`);
      }

      const { data: acceptedEstimates, error: acceptedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "accepted");

      if (acceptedError) {
        throw new Error(`Database error: ${acceptedError.message}`);
      }

      const { data: rejectedEstimates, error: rejectedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "rejected");

      if (rejectedError) {
        throw new Error(`Database error: ${rejectedError.message}`);
      }

      // Get additional costs for all estimates
      const { data: additionalCostsData, error: additionalCostsError } = await supabase
        .from("estimate_additional_costs")
        .select("amount");

      if (additionalCostsError) {
        throw new Error(`Database error: ${additionalCostsError.message}`);
      }

      const total = totalEstimates?.length || 0;
      const draft = draftEstimates?.length || 0;
      const sent = sentEstimates?.length || 0;
      const accepted = acceptedEstimates?.length || 0;
      const rejected = rejectedEstimates?.length || 0;

      // Calculate total billed from additional costs
      const totalBilled = (additionalCostsData || []).reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      // Calculate paid and pending invoices
      const paid = accepted; // Accepted estimates are considered paid
      const pending = draft + sent; // Draft and sent are pending
      const expired = rejected; // Rejected are expired

      return {
        // Dashboard cards format
        dashboard_cards: {
          total_invoices: {
            label: "Total Invoices",
            value: total,
            icon: "document",
            color: "blue"
          },
          total_billed: {
            label: "Total Billed", 
            value: `$${totalBilled.toFixed(2)}`,
            icon: "dollar",
            color: "green"
          },
          paid_invoices: {
            label: "Paid Invoices",
            value: paid,
            icon: "checkmark",
            color: "green"
          },
          pending_invoices: {
            label: "Pending",
            value: pending,
            icon: "exclamation",
            color: "orange"
          }
        },
        
        // Detailed breakdown
        detailed_stats: {
        total,
        draft,
        sent,
        accepted,
        rejected,
          paid,
          pending,
          expired,
          totalBilled: totalBilled.toFixed(2),
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        sentPercentage: total > 0 ? ((sent / total) * 100).toFixed(1) : "0.0",
        acceptedPercentage: total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0",
          rejectedPercentage: total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0",
          paidPercentage: total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0",
          pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0.0"
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ job_id: jobId }, { page, limit });
      
      if (result.estimates && result.estimates.length > 0) {
        const estimatesWithCalculations = await Promise.all(
          result.estimates.map(async (estimate) => {
            try {
              const additionalCosts = await Estimate.getAdditionalCosts(estimate.id);
              
              const materialsCost = parseFloat(estimate.materials_cost) || 0;
              const laborCost = parseFloat(estimate.labor_cost) || 0;
              const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
                return sum + (parseFloat(cost.amount) || 0);
              }, 0);
              
              const subtotal = materialsCost + laborCost + additionalCostsTotal;
              const taxAmount = (subtotal * (parseFloat(estimate.tax_percentage) || 0)) / 100;
              const totalAmount = subtotal + taxAmount;
              
              return {
                ...estimate,
                additional_costs_list: additionalCosts,
                materials_cost: materialsCost,
                labor_cost: laborCost,
                additional_costs: additionalCostsTotal,
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount
              };
            } catch (error) {
              console.error(`Error processing estimate ${estimate.id}:`, error);
              return {
                ...estimate,
                additional_costs_list: [],
                additional_costs: 0,
                subtotal: (parseFloat(estimate.materials_cost) || 0) + (parseFloat(estimate.labor_cost) || 0),
                tax_amount: 0,
                total_amount: (parseFloat(estimate.materials_cost) || 0) + (parseFloat(estimate.labor_cost) || 0)
              };
            }
          })
        );
        
        result.estimates = estimatesWithCalculations;
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByCustomer(customerId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ customer_id: customerId }, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

 
  static async createAdditionalCost(additionalCostData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .insert([additionalCostData])
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getAdditionalCosts(estimateId) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async updateAdditionalCost(additionalCostId, updateData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .update(updateData)
        .eq("id", additionalCostId)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteAdditionalCost(additionalCostId) {
    try {
      const { error } = await supabase
        .from("estimate_additional_costs")
        .delete()
        .eq("id", additionalCostId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCosts(estimateId) {
    try {
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      
      const materialsCost = parseFloat(estimate.materials_cost) || 0;
      const laborCost = parseFloat(estimate.labor_cost) || 0;
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      const subtotal = materialsCost + laborCost + additionalCostsTotal;
      const taxAmount = (subtotal * parseFloat(estimate.tax_percentage)) / 100;
      const totalAmount = subtotal + taxAmount;

      
      await Estimate.update(estimateId, {
        additional_costs: additionalCostsTotal,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      });

      return {
        materials_cost: materialsCost,
        labor_cost: laborCost,
        additional_costs: additionalCostsTotal,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };
    } catch (error) {
      throw error;
    }
  }

 
  static async checkEstimateRelationships(estimateId) {
    try {
      if (!estimateId) {
        throw new Error('Estimate ID is required');
      }

      const relationships = [];

     
      const { data: additionalCostsData, error: additionalCostsError } = await supabase
        .from('estimate_additional_costs')
        .select('id, description')
        .eq('estimate_id', estimateId)
        .limit(1);

      if (additionalCostsError) {
        console.error('Error checking additional costs:', additionalCostsError);
      
      } else if (additionalCostsData && additionalCostsData.length > 0) {
        relationships.push({
          table: 'estimate_additional_costs',
          count: additionalCostsData.length,
          message: 'This estimate has associated additional costs'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };
    } catch (error) {
      console.error('Error in checkEstimateRelationships:', error);
      throw error;
    }
  }
}
