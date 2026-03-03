import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const QB_TOKENS_FILE = path.join(process.cwd(), 'data', 'qb-tokens.json');

async function loadStoredRefreshToken() {
  try {
    const raw = await fs.readFile(QB_TOKENS_FILE, 'utf8');
    const json = JSON.parse(raw);
    if (json && typeof json.refresh_token === 'string' && json.refresh_token.trim()) {
      return json.refresh_token.trim();
    }
  } catch {
    // file missing or invalid – use .env
  }
  return null;
}

async function saveRefreshToken(refreshToken) {
  try {
    const dir = path.dirname(QB_TOKENS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      QB_TOKENS_FILE,
      JSON.stringify({ refresh_token: refreshToken, updated_at: new Date().toISOString() }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn('Could not save QuickBooks refresh token to file:', err.message);
  }
}

// Get a fresh QuickBooks access token; refresh token is auto-saved so it stays valid.
async function getQuickBooksAccessToken() {
  let refreshToken = await loadStoredRefreshToken();
  if (!refreshToken) {
    refreshToken = process.env.QB_REFRESH_TOKEN;
  }
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;

  if (!refreshToken) {
    throw new Error('QB_REFRESH_TOKEN is missing. Set it in .env or reconnect QuickBooks.');
  }

  if (!clientId || !clientSecret) {
    throw new Error('QB_CLIENT_ID or QB_CLIENT_SECRET is missing in environment variables');
  }

  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  let data;
  try {
    const res = await axios.post(tokenUrl, params.toString(), {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    data = res.data;
  } catch (err) {
    if (err.response?.data?.error === 'invalid_grant') {
      const fromFile = await loadStoredRefreshToken();
      if (fromFile && fromFile === refreshToken) {
        await saveRefreshToken('').catch(() => {});
      }
      throw new Error('QuickBooks refresh token expired or invalid. Please reconnect QuickBooks from the app.');
    }
    throw err;
  }

  if (!data || !data.access_token) {
    throw new Error('Unable to get QuickBooks access token from refresh token');
  }

  if (data.refresh_token) {
    await saveRefreshToken(data.refresh_token);
  }

  return data.access_token;
}

// Helper to call QuickBooks Accounting API.
async function callQuickBooks(path, method = 'GET', body, contentType = 'application/json') {
  const accessToken = await getQuickBooksAccessToken();
  const realmId = process.env.QB_REAL_ID || process.env.QB_REALM_ID;

  if (!realmId) {
    throw new Error('QB_REALM_ID is missing in environment variables');
  }

  const baseUrl =
    process.env.QB_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com/v3/company'
      : 'https://sandbox-quickbooks.api.intuit.com/v3/company';

  const url = `${baseUrl}/${realmId}${path}`;

  const { data } = await axios({
    url,
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': contentType,  // ✅ Dynamic contentType
    },
    data: body || undefined,
  });

  return data;
}

// Helper: create customer in QuickBooks
async function createQuickBooksCustomer(customerPayload) {
  const response = await callQuickBooks('/customer', 'POST', customerPayload);
  return response;
}

// Get one customer from QuickBooks by Id
async function getQuickBooksCustomerById(qbCustomerId) {
  const response = await callQuickBooks(`/customer/${qbCustomerId}`, 'GET');
  return response;
}

// Update customer in QuickBooks (sparse update)
async function updateQuickBooksCustomer(qbCustomerId, fieldsToUpdate) {
  const current = await getQuickBooksCustomerById(qbCustomerId);
  const customer = current?.Customer;

  if (!customer) {
    throw new Error('QuickBooks customer not found for update');
  }

  const payload = {
    ...customer,
    ...fieldsToUpdate,
    Id: customer.Id,
    SyncToken: customer.SyncToken,
    sparse: true,
  };

  const response = await callQuickBooks('/customer?operation=update', 'POST', payload);
  return response;
}

async function deleteQuickBooksCustomer(qbCustomerId) {
  const current = await getQuickBooksCustomerById(qbCustomerId);
  const customer = current?.Customer;

  if (!customer) {
    // If not found in QB, consider it already deleted
    return null;
  }

  const payload = {
    Id: customer.Id,
    SyncToken: customer.SyncToken,
    Active: false,
    sparse: true,
  };

  const response = await callQuickBooks(
    '/customer?operation=update',
    'POST',
    payload
  );

  return response;
}

// ========== INVOICE FUNCTIONS ==========

// Get one invoice from QuickBooks by Id
async function getQuickBooksInvoiceById(qbInvoiceId) {
  const response = await callQuickBooks(`/invoice/${qbInvoiceId}`, 'GET');
  return response;
}

// Create invoice in QuickBooks
async function createQuickBooksInvoice(invoicePayload) {
  try {
    const response = await callQuickBooks('/invoice', 'POST', invoicePayload);
    return response;
  } catch (error) {
    // Better error handling - show QuickBooks API error details
    if (error.response && error.response.data) {
      const qbError = error.response.data;
      throw new Error(`QuickBooks API Error: ${qbError.error || 'Unknown error'} - ${qbError.error_description || qbError.message || JSON.stringify(qbError)}`);
    }
    throw error;
  }
}

// Send invoice email in QuickBooks
async function sendQuickBooksInvoiceEmail(qbInvoiceId) {
  const delay = ms => new Promise(res => setTimeout(res, ms));
  
  try {
    console.log('🚀 Starting QuickBooks email send process...');
    console.log('📧 Invoice ID:', qbInvoiceId);
    
    console.log('⏰ Waiting 6 seconds for QuickBooks processing...');
    await delay(6000); // 6 sec safer for sandbox

    // Get fresh invoice with minorversion (important for sandbox stability)
    console.log('🔍 Getting fresh invoice data...');
    const freshInvoice = await callQuickBooks(
      `/invoice/${qbInvoiceId}?minorversion=65`,
      'GET'
    );
    
    console.log('📋 Fresh Invoice Response:', JSON.stringify(freshInvoice, null, 2));
    
    const syncToken = freshInvoice.Invoice?.SyncToken;
    const emailAddress = freshInvoice.Invoice?.BillEmail?.Address;
    
    console.log('🔑 Fresh SyncToken:', syncToken);
    console.log('📧 Email Address:', emailAddress);
    
    if (!emailAddress) {
      throw new Error('❌ Email address not found in invoice');
    }
    
    // Use sendTo parameter with octet-stream content type (Fix: prevents NullPointerException)
    const sendUrl = `/invoice/${qbInvoiceId}/send?sendTo=${encodeURIComponent(emailAddress)}&minorversion=65`;
    console.log('🌐 Send URL:', sendUrl);
    console.log('📦 Content-Type: application/octet-stream');
    
    // Send invoice email with octet-stream content type
    console.log('📤 Sending email request...');
    const response = await callQuickBooks(
      sendUrl,
      'POST',
      null,
      'application/octet-stream'  // ✅ Use octet-stream for send endpoint
    );
    
    console.log('✅ Invoice email sent successfully');
    console.log('📧 Response:', JSON.stringify(response, null, 2));
    return response;
    
  } catch (error) {
    console.error('❌ ERROR IN EMAIL SEND:');
    console.error('🔍 Full Error:', error);
    console.error('📊 Error Response:', error.response?.data);
    console.error('🔗 Error URL:', error.config?.url);
    console.error('📝 Error Method:', error.config?.method);
    console.error('📦 Error Body:', error.config?.data);
    
    const code = error.response?.data?.Fault?.Error?.[0]?.code;
    
    // Handle common QuickBooks errors with retry
    if (code === "5010" || code === "10000") {
      console.log('⚠️ QuickBooks timing error, retrying in 5 sec...');
      await delay(5000);
      
      try {
        // Retry with octet-stream content type
        const freshInvoice = await callQuickBooks(
          `/invoice/${qbInvoiceId}?minorversion=65`,
          'GET'
        );
        const emailAddress = freshInvoice.Invoice?.BillEmail?.Address;
        
        const retryResponse = await callQuickBooks(
          `/invoice/${qbInvoiceId}/send?sendTo=${encodeURIComponent(emailAddress)}&minorversion=65`,
          'POST',
          null,
          'application/octet-stream'  // ✅ Use octet-stream for retry too
        );
        console.log('✅ Invoice email sent on retry');
        return retryResponse;
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError.response?.data || retryError.message);
      }
    }
    
    // Other errors
    if (error.response && error.response.data) {
      const qbError = error.response.data;
      console.error('❌ QuickBooks Email Error:', JSON.stringify(qbError, null, 2));
      throw new Error(`QuickBooks Email Error: ${qbError.error || 'Unknown error'}`);
    }
    throw error;
  }
}

// Update invoice in QuickBooks (sparse update)
async function updateQuickBooksInvoice(qbInvoiceId, fieldsToUpdate) {
  const current = await getQuickBooksInvoiceById(qbInvoiceId);
  const invoice = current?.Invoice;

  if (!invoice) {
    throw new Error('QuickBooks invoice not found for update');
  }

  const payload = {
    ...invoice,
    ...fieldsToUpdate,
    Id: invoice.Id,
    SyncToken: invoice.SyncToken,
    sparse: true,
  };

  const response = await callQuickBooks('/invoice?operation=update', 'POST', payload);
  return response;
}

// Delete invoice in QuickBooks (actually makes it inactive)
async function deleteQuickBooksInvoice(qbInvoiceId) {
  const current = await getQuickBooksInvoiceById(qbInvoiceId);
  const invoice = current?.Invoice;

  if (!invoice) {
    // If not found in QB, consider it already deleted
    return null;
  }

  // QuickBooks me invoice ko inactive mark karo (hard delete nahi hota)
  const payload = {
    Id: invoice.Id,
    SyncToken: invoice.SyncToken,
    Active: false,
    sparse: true,
  };

  const response = await callQuickBooks(
    '/invoice?operation=update',
    'POST',
    payload
  );

  return response;
}

// Get all invoices from QuickBooks (for sync)
async function getQuickBooksInvoices() {
  const response = await callQuickBooks('/query?query=select * from Invoice', 'GET');
  return response;
}

export {
  getQuickBooksAccessToken,
  callQuickBooks,
  createQuickBooksCustomer,
  updateQuickBooksCustomer,
  deleteQuickBooksCustomer,
  getQuickBooksInvoiceById,
  createQuickBooksInvoice,
  sendQuickBooksInvoiceEmail,
  updateQuickBooksInvoice,
  deleteQuickBooksInvoice,
  getQuickBooksInvoices,
};


