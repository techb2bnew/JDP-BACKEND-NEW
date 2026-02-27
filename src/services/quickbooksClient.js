import axios from 'axios';

// Get a fresh QuickBooks access token using the long‑lived refresh token.
async function getQuickBooksAccessToken() {
  const refreshToken = process.env.QB_REFRESH_TOKEN;
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;

  if (!refreshToken) {
    throw new Error('QB_REFRESH_TOKEN is missing in environment variables');
  }

  if (!clientId || !clientSecret) {
    throw new Error('QB_CLIENT_ID or QB_CLIENT_SECRET is missing in environment variables');
  }

  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  const { data } = await axios.post(tokenUrl, params.toString(), {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  });

  if (!data || !data.access_token) {
    throw new Error('Unable to get QuickBooks access token from refresh token');
  }

  return data.access_token;
}

// Helper to call QuickBooks Accounting API.
async function callQuickBooks(path, method = 'GET', body) {
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
      'Content-Type': 'application/json',
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

  // Hard delete ke bajaye QuickBooks me customer ko inactive mark karo
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
  updateQuickBooksInvoice,
  deleteQuickBooksInvoice,
  getQuickBooksInvoices,
};


