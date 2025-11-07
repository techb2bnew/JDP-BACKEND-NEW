import { JobDocumentController } from '../controllers/jobDocumentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export async function jobDocumentRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  // Create document with file upload
  fastify.post('/document', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const maxSize = 50 * 1024 * 1024; // 50MB
          if (part.file && part.file.bytesRead > maxSize) {
            return reply.status(400).send({
              success: false,
              message: `File ${part.filename} is too large. Maximum size allowed is 50MB`,
              statusCode: 400
            });
          }

          try {
            const buffer = await part.toBuffer();
            const fileName = `job-documents/${Date.now()}-${part.filename}`;

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

            // Set document_file to the S3 URL
            if (part.fieldname === 'document_file') {
              body.document_file = result.Location;
            }
          } catch (fileError) {
            console.error(`File upload error for ${part.filename}:`, fileError.message);
            return reply.status(500).send({
              success: false,
              message: `Failed to upload file: ${fileError.message}`,
              statusCode: 500
            });
          }
        } else {
          body[part.fieldname] = part.value;
        }
      }

      request.body = body;
      request.files = files;
    }

    return JobDocumentController.createDocument(request, reply);
  });

  // Get all documents with filters and pagination
  fastify.get('/documents', JobDocumentController.getAllDocuments);

  // Get document by ID
  fastify.get('/document/:id', JobDocumentController.getDocumentById);

  // Get documents by job ID
  fastify.get('/job/:jobId/documents', JobDocumentController.getDocumentsByJobId);

  // Update document (with optional file upload)
  fastify.put('/document/:id', async (request, reply) => {
    if (request.isMultipart()) {
      const body = {};
      const files = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const maxSize = 50 * 1024 * 1024; // 50MB
          if (part.file && part.file.bytesRead > maxSize) {
            return reply.status(400).send({
              success: false,
              message: `File ${part.filename} is too large. Maximum size allowed is 50MB`,
              statusCode: 400
            });
          }

          try {
            const buffer = await part.toBuffer();
            const fileName = `job-documents/${Date.now()}-${part.filename}`;

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

            // Set document_file to the S3 URL
            if (part.fieldname === 'document_file') {
              body.document_file = result.Location;
            }
          } catch (fileError) {
            console.error(`File upload error for ${part.filename}:`, fileError.message);
            return reply.status(500).send({
              success: false,
              message: `Failed to upload file: ${fileError.message}`,
              statusCode: 500
            });
          }
        } else {
          body[part.fieldname] = part.value;
        }
      }

      request.body = body;
      request.files = files;
    }

    return JobDocumentController.updateDocument(request, reply);
  });

  // Delete document
  fastify.delete('/document/:id', JobDocumentController.deleteDocument);
}

