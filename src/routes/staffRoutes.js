import { StaffController } from '../controllers/staffController.js';
import { authenticateToken, requireAdminOrSuperAdmin } from '../middleware/authMiddleware.js';

export default async function staffRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/createStaff', {
    preHandler: authenticateToken,
  }, StaffController.createStaff);

  fastify.get('/getAllStaff', {
    preHandler: authenticateToken
  }, StaffController.getAllStaff);

  fastify.get('/searchStaff', {
    preHandler: authenticateToken
  }, StaffController.searchStaff);

  fastify.get('/getStaffById/:staffId', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['staffId'],
        properties: {
          staffId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, StaffController.getStaffById);

  fastify.post('/updateStaff/:staffId', {
    preHandler: authenticateToken,
  }, StaffController.updateStaff);

  fastify.post('/updateProfile/:staffId', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const maxSize = 50 * 1024 * 1024; 
          if (part.file && part.file.bytesRead > maxSize) {
            console.error(`File ${part.filename} is too large. Maximum size allowed is 50MB`);
            return reply.status(400).send({
              success: false,
              message: `File ${part.filename} is too large. Maximum size allowed is 50MB`,
              statusCode: 400
            });
          }

          try {
            const buffer = await part.toBuffer();
            const fileName = `staff/${part.fieldname}/${Date.now()}-${part.filename}`;

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

    return StaffController.updateProfile(request, reply);
  });

  fastify.delete('/deleteStaff/:staffId', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['staffId'],
        properties: {
          staffId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, StaffController.deleteStaff);
}
