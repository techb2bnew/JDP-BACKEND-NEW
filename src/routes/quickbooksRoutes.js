import { callQuickBooks, getQuickBooksInvoices } from '../services/quickbooksClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { supabase } from '../config/database.js';

export default async function quickbooksRoutes(fastify, options) {
  // QuickBooks routes secure rakhne ke liye auth
  fastify.addHook('preHandler', authenticateToken);

  // Simple test route: QuickBooks se customers read karo
  fastify.get('/customers/from-qb', async (request, reply) => {
    try {
      const data = await callQuickBooks('/query?query=select * from Customer');

      return {
        success: true,
        source: 'quickbooks',
        data,
      };
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch customers from QuickBooks',
      });
    }
  });

  // Sync route: QuickBooks ke saare customers ko Supabase customers table me daalo / update karo
  fastify.post('/customers/sync-to-db', async (request, reply) => {
    try {
      const data = await callQuickBooks('/query?query=select * from Customer');
      const qbCustomers = data?.QueryResponse?.Customer || [];

      for (const qbCust of qbCustomers) {
        const email = qbCust.PrimaryEmailAddr?.Address || null;
        const name = qbCust.CompanyName || qbCust.DisplayName || qbCust.GivenName;
        const phone = qbCust.PrimaryPhone?.FreeFormNumber || null;
        const address = qbCust.BillAddr?.Line1 || null;
        const qbId = qbCust.Id;

        // Pehle qb_customer_id se dhoondo
        const { data: existingByQbId } = await supabase
          .from('customers')
          .select('id')
          .eq('qb_customer_id', qbId)
          .maybeSingle();

        if (existingByQbId) {
          await supabase
            .from('customers')
            .update({
              customer_name: name,
              email,
              phone,
              address,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByQbId.id);
          continue;
        }

        // Warna email se try karo
        let targetId = null;
        if (email) {
          const { data: existingByEmail } = await supabase
            .from('customers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (existingByEmail) {
            targetId = existingByEmail.id;
          }
        }

        if (targetId) {
          await supabase
            .from('customers')
            .update({
              qb_customer_id: qbId,
              customer_name: name,
              phone,
              address,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetId);
        } else {
          await supabase.from('customers').insert({
            customer_name: name,
            company_name: qbCust.CompanyName || null,
            email,
            phone,
            address,
            qb_customer_id: qbId,
            status: 'active',
          });
        }
      }

      return reply.send({
        success: true,
        message: 'QuickBooks customers synced to DB',
        count: qbCustomers.length,
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to sync customers from QuickBooks to DB',
      });
    }
  });

  // Simple test route: QuickBooks se invoices read karo
  fastify.get('/invoices/from-qb', async (request, reply) => {
    try {
      const data = await getQuickBooksInvoices();

      return {
        success: true,
        source: 'quickbooks',
        data,
      };
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch invoices from QuickBooks',
      });
    }
  });

  // Sync route: QuickBooks ke saare invoices ko Supabase estimates table me daalo / update karo
  fastify.post('/invoices/sync-to-db', async (request, reply) => {
    try {
      const data = await getQuickBooksInvoices();
      const qbInvoices = data?.QueryResponse?.Invoice || [];

      for (const qbInv of qbInvoices) {
        const qbInvoiceId = qbInv.Id;
        const qbCustomerId = qbInv.CustomerRef?.value;
        const totalAmount = parseFloat(qbInv.TotalAmt || 0);
        const docNumber = qbInv.DocNumber || null;
        const txnDate = qbInv.TxnDate || null;
        const dueDate = qbInv.DueDate || null;

        // Customer ka internal ID nikaalo (qb_customer_id se)
        let customerId = null;
        if (qbCustomerId) {
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('qb_customer_id', qbCustomerId)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
          }
        }

        // Pehle qb_invoice_id se dhoondo
        const { data: existingByQbId } = await supabase
          .from('estimates')
          .select('id')
          .eq('qb_invoice_id', qbInvoiceId)
          .maybeSingle();

        if (existingByQbId) {
          // Update existing estimate
          await supabase
            .from('estimates')
            .update({
              total_amount: totalAmount,
              invoice_number: docNumber,
              issue_date: txnDate,
              due_date: dueDate,
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByQbId.id);
          continue;
        }

        // Warna invoice_number se try karo
        let targetId = null;
        if (docNumber) {
          const { data: existingByInvoiceNumber } = await supabase
            .from('estimates')
            .select('id')
            .eq('invoice_number', docNumber)
            .maybeSingle();

          if (existingByInvoiceNumber) {
            targetId = existingByInvoiceNumber.id;
          }
        }

        if (targetId) {
          // Update existing estimate with qb_invoice_id
          await supabase
            .from('estimates')
            .update({
              qb_invoice_id: qbInvoiceId,
              total_amount: totalAmount,
              issue_date: txnDate,
              due_date: dueDate,
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetId);
        } else {
          // Naya estimate insert karo (agar customer mapped hai)
          if (customerId) {
            await supabase.from('estimates').insert({
              estimate_title: `QuickBooks Invoice ${docNumber || qbInvoiceId}`,
              customer_id: customerId,
              invoice_number: docNumber,
              invoice_type: 'final_invoice',
              total_amount: totalAmount,
              issue_date: txnDate,
              due_date: dueDate,
              qb_invoice_id: qbInvoiceId,
              status: 'sent',
              estimate_date: txnDate || new Date().toISOString().split('T')[0],
              email_address: '', // Required field, empty for now
            });
          }
        }
      }

      return reply.send({
        success: true,
        message: 'QuickBooks invoices synced to DB',
        count: qbInvoices.length,
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to sync invoices from QuickBooks to DB',
      });
    }
  });
}

