# Job Management API Examples

## Base URL
```
http://localhost:3000/api/job
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Create Job
**POST** `/createJob`

### Request Body:
```json
{
  "job_title": "Electrical Installation Job",
  "job_type": "service_based",
  "customer_id": 1,
  "contractor_id": 1,
  "description": "Install electrical panel and wiring for new building",
  "priority": "high",
  "address": "123 Main Street",
  "city_zip": "New York, NY 10001",
  "phone": "555-1234",
  "email": "customer@example.com",
  "bill_to_address": "123 Main Street",
  "bill_to_city_zip": "New York, NY 10001",
  "bill_to_phone": "555-1234",
  "bill_to_email": "customer@example.com",
  "same_as_address": true,
  "due_date": "2025-09-18",
  "estimated_hours": 8.5,
  "estimated_cost": 1500.00,
  "assigned_lead_labor_ids": "[1, 3, 5]",
  "assigned_labor_ids": "[2, 4, 6, 8]",
  "assigned_material_ids": "[1, 2, 3]",
  "status": "active"
}
```

### cURL Example:
```bash
curl -X POST http://localhost:3000/api/job/createJob \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "job_title": "Electrical Installation Job",
    "job_type": "service_based",
    "customer_id": 1,
    "contractor_id": 1,
    "description": "Install electrical panel and wiring for new building",
    "priority": "high",
    "address": "123 Main Street",
    "city_zip": "New York, NY 10001",
    "phone": "555-1234",
    "email": "customer@example.com",
    "due_date": "2025-09-18",
    "estimated_hours": 8.5,
    "estimated_cost": 1500.00,
    "assigned_lead_labor_ids": "[1, 3, 5]",
    "assigned_labor_ids": "[2, 4, 6, 8]",
    "assigned_material_ids": "[1, 2, 3]",
    "status": "active"
  }'
```

---

## 2. Get All Jobs
**GET** `/getJobs`

### Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in job title or description
- `status` (optional): Filter by status (draft, active, in_progress, completed, cancelled, on_hold)
- `priority` (optional): Filter by priority (low, medium, high, urgent)
- `job_type` (optional): Filter by job type (service_based, contract_based)
- `customer_id` (optional): Filter by customer ID
- `contractor_id` (optional): Filter by contractor ID
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)

### cURL Examples:

#### Get all jobs:
```bash
curl -X GET http://localhost:3000/api/job/getJobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get jobs with filters:
```bash
curl -X GET "http://localhost:3000/api/job/getJobs?page=1&limit=5&status=active&priority=high&sortBy=due_date&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Search jobs:
```bash
curl -X GET "http://localhost:3000/api/job/getJobs?search=electrical&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. Get Job by ID
**GET** `/getJobById/:id`

### cURL Example:
```bash
curl -X GET http://localhost:3000/api/job/getJobById/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Update Job
**POST** `/updateJob/:id`

### Request Body:
```json
{
  "job_title": "Updated Electrical Installation Job",
  "priority": "urgent",
  "status": "in_progress",
  "estimated_hours": 10.0,
  "estimated_cost": 1800.00,
  "assigned_lead_labor_ids": "[1, 2, 3]",
  "assigned_labor_ids": "[1, 2, 3, 4, 5]"
}
```

### cURL Example:
```bash
curl -X POST http://localhost:3000/api/job/updateJob/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "job_title": "Updated Electrical Installation Job",
    "job_type": "service_based",
    "customer_id": 1,
    "contractor_id": 1,
    "description": "Updated job description",
    "priority": "urgent",
    "address": "456 Updated Street",
    "city_zip": "Updated City, NY 10002",
    "phone": "555-5678",
    "email": "updated@example.com",
    "bill_to_address": "456 Updated Street",
    "bill_to_city_zip": "Updated City, NY 10002",
    "bill_to_phone": "555-5678",
    "bill_to_email": "updated@example.com",
    "same_as_address": true,
    "due_date": "2025-10-15",
    "estimated_hours": 10.0,
    "estimated_cost": 1800.00,
    "assigned_lead_labor_ids": "[1, 2, 3]",
    "assigned_labor_ids": "[1, 2, 3, 4, 5]",
    "assigned_material_ids": "[1, 2, 3, 4]",
    "status": "in_progress"
  }'
```

---

## 5. Delete Job
**DELETE** `/deleteJob/:id`

### cURL Example:
```bash
curl -X DELETE http://localhost:3000/api/job/deleteJob/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. Get Job Statistics
**GET** `/getJobStats/stats`

### cURL Example:
```bash
curl -X GET http://localhost:3000/api/job/getJobStats/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Example:
```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "total": 4,
    "active": 1,
    "completed": 1,
    "draft": 1,
    "pending": 1,
    "totalRevenue": "16100.00",
    "activePercentage": "25.0",
    "completedPercentage": "25.0",
    "draftPercentage": "25.0",
    "pendingPercentage": "25.0"
  },
  "statusCode": 200
}
```

---

## 7. Get Jobs by Customer
**GET** `/getJobsByCustomer/:customerId`

### cURL Example:
```bash
curl -X GET http://localhost:3000/api/job/getJobsByCustomer/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 8. Get Jobs by Contractor
**GET** `/getJobsByContractor/:contractorId`

### cURL Example:
```bash
curl -X GET http://localhost:3000/api/job/getJobsByContractor/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9. Get Job Dashboard Details
**GET** `/getJobDashboardDetails/:id`

### Description:
Get comprehensive job details for dashboard view including project summary, key metrics, transaction history, material usage, and labor summary.

### cURL Example:
```bash
curl -X GET http://localhost:3000/api/job/getJobDashboardDetails/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Example:
```json
{
  "success": true,
  "message": "Job dashboard details retrieved successfully",
  "data": {
    "id": 1,
    "job_title": "Electrical Panel Installation",
    "job_type": "service_based",
    "status": "in_progress",
    "priority": "high",
    "estimated_cost": 5000.00,
    "estimated_hours": 40,
    "due_date": "2025-01-15",
    "customer": {
      "id": 1,
      "customer_name": "John Doe",
      "company_name": "ABC Corp"
    },
    "contractor": {
      "id": 1,
      "contractor_name": "Elite Electrical Services"
    },
    "assigned_lead_labor": [...],
    "assigned_labor": [...],
    "assigned_materials": [...],
    
    "projectSummary": {
      "jobEstimate": 5000.00,
      "materialCost": 1910.00,
      "laborCost": 1550.00,
      "actualProjectCost": 3460.00,
      "projectProgress": 50
    },
    
    "keyMetrics": {
      "totalHoursWorked": 40,
      "totalMaterialUsed": 3,
      "totalLabourEntries": 4,
      "numberOfInvoices": 1
    },
    
    "transactionHistory": [
      {
        "id": 1,
        "type": "Estimate",
        "description": "Initial project estimate with detailed breakdown",
        "amount": 5000.00,
        "status": "In Progress",
        "date": "2025-01-15T10:30:00Z"
      }
    ],
    
    "materialUsage": {
      "totalCost": 1910.00,
      "materials": [
        {
          "id": 1,
          "material_name": "Electrical Panel",
          "sku": "EP001",
          "quantity": 1,
          "unit_cost": 650.00,
          "total_cost": 650.00
        }
      ]
    },
    
    "laborSummary": {
      "totalCost": 1550.00,
      "laborEntries": [
        {
          "id": 1,
          "labor_code": "L001",
          "trade": "Electrician",
          "hourly_rate": 50.00,
          "user": {
            "full_name": "Mike Johnson"
          }
        }
      ],
      "leadLaborEntries": [...]
    }
  },
  "statusCode": 200
}
```

---

## Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": 1,
    "job_title": "Electrical Installation Job",
    "job_type": "service_based",
    "customer_id": 1,
    "contractor_id": 1,
    "description": "Install electrical panel and wiring for new building",
    "priority": "high",
    "status": "active",
    "due_date": "2025-09-18",
    "estimated_hours": 8.5,
    "estimated_cost": 1500.00,
        "assigned_lead_labor_ids": "[1, 3, 5]",
        "assigned_labor_ids": "[2, 4, 6, 8]",
        "assigned_material_ids": "[1, 2, 3]",
        "assigned_lead_labor": [
          {
            "id": 1,
            "labor_code": "LL001",
            "department": "Electrical",
            "specialization": "Panel Installation",
            "trade": "Electrician",
            "experience": "5 years",
            "user": {
              "id": 100,
              "full_name": "Mike Johnson",
              "email": "mike@example.com",
              "phone": "555-0001"
            }
          }
        ],
        "assigned_labor": [
          {
            "id": 2,
            "labor_code": "L001",
            "trade": "Electrician",
            "experience": "2 years",
            "hourly_rate": 25.00,
            "availability": "Available",
            "user": {
              "id": 102,
              "full_name": "John Smith",
              "email": "john@example.com",
              "phone": "555-0003"
            }
          }
        ],
        "assigned_materials": [
          {
            "id": 1,
            "material_name": "Electrical Panel",
            "sku": "EP001",
            "quantity": 2,
            "unit": "Pieces",
            "unit_cost": 500.00,
            "total_cost": 1000.00,
            "supplier": "ABC Electrical Supply"
          }
        ],
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
    "customer": {
      "id": 1,
      "customer_name": "John Doe",
      "company_name": "ABC Corp",
      "email": "john@abc.com",
      "phone": "555-1234"
    },
    "contractor": {
      "id": 1,
      "contractor_name": "Elite Electrical Services",
      "company_name": "Elite Electrical",
      "email": "info@eliteelectrical.com",
      "phone": "555-5678"
    }
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Job not found",
  "error": 404
}
```

---

## Field Descriptions

### Job Types:
- `service_based`: One-time service jobs
- `contract_based`: Ongoing contract work

### Priorities:
- `low`: Low priority
- `medium`: Medium priority (default)
- `high`: High priority
- `urgent`: Urgent priority

### Statuses:
- `draft`: Job is in draft state
- `active`: Job is active and ready to start
- `in_progress`: Job is currently being worked on
- `completed`: Job has been completed
- `cancelled`: Job has been cancelled
- `on_hold`: Job is temporarily on hold

### JSON Fields:
- `assigned_lead_labor_ids`: JSON array of lead labor IDs (e.g., "[1, 3, 5]")
- `assigned_labor_ids`: JSON array of labor IDs (e.g., "[2, 4, 6, 8]")
- `assigned_material_ids`: JSON array of material IDs (e.g., "[1, 2, 3]")
