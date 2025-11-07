import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';

import { 
  authenticateToken, 
  requireSuperAdmin,
  requireAdminOrSuperAdmin 
} from './middleware/authMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import rolePermissionRoutes from './routes/rolePermissionRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import laborRoutes from './routes/laborRoutes.js';
import leadLaborRoutes from './routes/leadLaborRoutes.js';
import suppliersRoutes from './routes/suppliersRoute.js';
import productRoutes from './routes/productRoutes.js';
import { customerRoutes } from './routes/customerRoutes.js';
import { contractorRoutes } from './routes/contractorRoutes.js';
import { jobRoutes } from './routes/jobRoutes.js';
import estimateRoutes from './routes/estimateRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import { configurationRoutes } from './routes/configurationRoutes.js';
import { jobBluesheetRoutes } from './routes/jobBluesheetRoutes.js';
import { jobDocumentRoutes } from './routes/jobDocumentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
  bodyLimit: 100 * 1024 * 1024, 
  maxParamLength: 200, 
  requestTimeout: 300000, 
  keepAliveTimeout: 300000 
});

await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key'
});

await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, 
    files: 10, 
    fieldSize: 100 * 1024 * 1024, 
    fieldNameSize: 100, 
    fieldValueSize: 100 * 1024 * 1024, 
    headerPairs: 2000 
  },
  attachFieldsToBody: false,
  throwFileSizeLimit: false 
});

fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    reply.status(413).send({
      success: false,
      message: 'File too large. Maximum file size allowed is 50MB per file.',
      statusCode: 413,
      error: 'Request Entity Too Large'
    });
  } else {
    reply.status(error.statusCode || 500).send({
      success: false,
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
});


fastify.decorate('authenticateToken', authenticateToken);
fastify.decorate('requireSuperAdmin', requireSuperAdmin);
fastify.decorate('requireAdminOrSuperAdmin', requireAdminOrSuperAdmin);

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(rolePermissionRoutes, { prefix: '/api/permissions' });
await fastify.register(staffRoutes, { prefix: '/api/staff' });
await fastify.register(laborRoutes, { prefix: '/api/labor' });
await fastify.register(leadLaborRoutes, { prefix: '/api/lead-labor' });
await fastify.register(suppliersRoutes, { prefix: '/api/suppliers' });
await fastify.register(productRoutes, { prefix: '/api/products' });
await fastify.register(customerRoutes, { prefix: '/api/customer' });
await fastify.register(contractorRoutes, { prefix: '/api/contractor' });
await fastify.register(jobRoutes, { prefix: '/api/job' });
await fastify.register(estimateRoutes, { prefix: '/api/estimates' });
await fastify.register(orderRoutes, { prefix: '/api/orders' });
await fastify.register(invoiceRoutes, { prefix: '/api/invoices' });
await fastify.register(configurationRoutes, { prefix: '/api/configuration' });
await fastify.register(jobBluesheetRoutes, { prefix: '/api/bluesheet' });
await fastify.register(jobDocumentRoutes, { prefix: '/api/job-documents' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      message: 'Validation error',
      errors: error.validation
    });
  }
  
  return reply.status(500).send({
    success: false,
    message: 'Internal server error',
    statusCode: 500,
    errors: null
  });
});

fastify.setNotFoundHandler((request, reply) => {
  return reply.status(404).send({
    success: false,
    message: 'Route not found',
    statusCode: 404
  });
});

const start = async () => {
  try {
    console.log('Starting server...');
    
    await fastify.listen({ 
      port: process.env.PORT || 3000, 
      host: '0.0.0.0' 
    });
    
    console.log(` Server is running on port ${process.env.PORT || 3000}`);
      
  } catch (error) {
    console.error(' Error starting server:', error);
    process.exit(1);
  }
};

start();
