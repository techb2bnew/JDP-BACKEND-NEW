-- Create job_documents table
CREATE TABLE IF NOT EXISTS job_documents (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    document_title VARCHAR(255) NOT NULL,
    document_file TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_created_at ON job_documents(created_at);

-- Add comments for documentation
COMMENT ON TABLE job_documents IS 'Job documents table for storing job-related documents';
COMMENT ON COLUMN job_documents.job_id IS 'Reference to the job this document belongs to';
COMMENT ON COLUMN job_documents.document_title IS 'Title of the document';
COMMENT ON COLUMN job_documents.document_file IS 'File URL or path of the document';

