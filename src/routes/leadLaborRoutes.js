import { LeadLaborController } from '../controllers/leadLaborController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function leadLaborRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);
  fastify.post('/createLeadLabor', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          try {
            const buffer = await part.toBuffer();
            const fileName = `lead-labor/${part.fieldname}/${Date.now()}-${part.filename}`;
            const uploadParams = {
              Bucket: process.env.S3_BUCKET_NAME || 'jdp-backend',
              Key: fileName,
              Body: buffer,
              ContentType: part.mimetype
            };
            const { s3 } = await import('../config/s3.js');
            const result = await s3.upload(uploadParams).promise();
            files[part.fieldname] = [{
              location: result.Location,
              key: result.Key,
              originalname: part.filename,
              mimetype: part.mimetype
            }];
          } catch (fileError) {

          }
        } else {
          body[part.fieldname] = part.value;
          if (part.fieldname === 'labor_code') {
            const shortTimestamp = Date.now().toString().slice(-6);
            body[part.fieldname] = `${part.value}_${shortTimestamp}`;
          }
        }
      }
      request.body = body;
      request.files = files;
    }
    return LeadLaborController.createLeadLabor(request, reply);
  });

  fastify.get('/getAllLeadLabor', {
  }, LeadLaborController.getAllLeadLabor);

  fastify.get('/getLeadLaborByIdForMobile/:leadLaborId', {
    schema: {
      params: {
        type: 'object',
        required: ['leadLaborId'],
        properties: {
          leadLaborId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, LeadLaborController.getLeadLaborByIdForMobile);

  fastify.get('/searchLeadLabor', {
  }, LeadLaborController.searchLeadLabor);

  fastify.get('/getLeadLaborById/:leadLaborId', {
  }, LeadLaborController.getLeadLaborById);

  fastify.post('/updateLeadLabor/:leadLaborId', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const maxSize = 50 * 1024 * 1024; 
          if (part.file && part.file.bytesRead > maxSize) {
            console.error(`File ${part.filename} is too large. Maximum size allowed is 50MB`);
            continue;
          }

          try {
            const buffer = await part.toBuffer();
            const fileName = `lead-labor/${part.fieldname}/${Date.now()}-${part.filename}`;

            const uploadParams = {
              Bucket: process.env.S3_BUCKET_NAME || 'jdp-backend',
              Key: fileName,
              Body: buffer,
              ContentType: part.mimetype
            };

            const { s3 } = await import('../config/s3.js');
            const result = await s3.upload(uploadParams).promise();

            files[part.fieldname] = [{
              location: result.Location,
              key: result.Key,
              originalname: part.filename,
              mimetype: part.mimetype
            }];
          } catch (fileError) {
            console.error(`File upload error for ${part.filename}:`, fileError.message);
          }
        } else {
          body[part.fieldname] = part.value;
        }
      }

      request.body = body;
      request.files = files;
    }

    return LeadLaborController.updateLeadLabor(request, reply);
  });

  fastify.post('/updateProfile/:leadLaborId', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const maxSize = 50 * 1024 * 1024; 
          if (part.file && part.file.bytesRead > maxSize) {
            console.error(`File ${part.filename} is too large. Maximum size allowed is 50MB`);
            continue;
          }

          try {
            const buffer = await part.toBuffer();
            const fileName = `lead-labor/${part.fieldname}/${Date.now()}-${part.filename}`;

            const uploadParams = {
              Bucket: process.env.S3_BUCKET_NAME || 'jdp-backend',
              Key: fileName,
              Body: buffer,
              ContentType: part.mimetype
            };

            const { s3 } = await import('../config/s3.js');
            const result = await s3.upload(uploadParams).promise();

            files[part.fieldname] = [{
              location: result.Location,
              key: result.Key,
              originalname: part.filename,
              mimetype: part.mimetype
            }];
          } catch (fileError) {
            console.error(`File upload error for ${part.filename}:`, fileError.message);
          }
        } else {
          body[part.fieldname] = part.value;
        }
      }

      request.body = body;
      request.files = files;
    }

    return LeadLaborController.updateProfile(request, reply);
  });

  fastify.delete('/deleteLeadLabor/:leadLaborId', {
    schema: {
      params: {
        type: 'object',
        required: ['leadLaborId'],
        properties: {
          leadLaborId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, LeadLaborController.deleteLeadLabor);

  fastify.post('/import', {
    handler: LeadLaborController.importLeadLabor
  });
  
}
