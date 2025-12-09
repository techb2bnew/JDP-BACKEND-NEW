# Notification API - Payload Examples

## Send Notification to Specific Jobs

### Endpoint
`POST /api/notification/sendNotification`

### Payload for "Send to Specific Job" Feature

**Important:** Jab "Send to specific job" option select hota hai, to `send_to_all` **HAMESHA `false`** hona chahiye!

```json
{
  "notification_title": "Job Update Notification",
  "message": "Your job has been assigned. Please check details.",
  "custom_link": "/jobs/JOB-2025-001",
  "image_url": null,
  "send_to_all": false,
  "recipient_roles": [],
  "labor_ids": [2, 4, 5],
  "lead_labor_ids": [1, 4, 5]
}
```

### Key Fields Explanation:

- **notification_title** (required): Title of the notification
- **message** (required): Message content
- **custom_link** (optional): URL or path to navigate when notification is clicked
- **image_url** (optional): Image URL for notification
- **send_to_all** (required): **`false`** - Hamesha false jab "Send to specific job" select hota hai ✅
- **recipient_roles** (required): Empty array `[]` - not using roles, using specific job recipients
- **labor_ids** (optional): Array of labor IDs - workers from selected jobs
- **lead_labor_ids** (optional): Array of lead labor IDs - supervisors from selected jobs

### Alternative: String Format (if frontend sends as strings)

```json
{
  "notification_title": "Job Update Notification",
  "message": "Your job has been assigned. Please check details.",
  "custom_link": "/jobs/JOB-2025-001",
  "send_to_all": false,
  "recipient_roles": [],
  "labor_ids": "[2,4,5]",
  "lead_labor_ids": "[1,4,5]"
}
```

The API will automatically parse string arrays like `"[2,4,5]"` to `[2,4,5]`.

### Example with All Optional Fields

```json
{
  "notification_title": "New Job Assignment",
  "message": "You have been assigned to a new job. Please review the details and start work.",
  "custom_link": "/jobs/123",
  "image_url": "https://example.com/image.jpg",
  "send_to_all": false,
  "recipient_roles": [],
  "order_id": null,
  "job_id": null,
  "product_id": null,
  "customer_id": null,
  "contractor_id": null,
  "bluesheet_id": null,
  "staff_id": null,
  "lead_labor_id": null,
  "labor_id": null,
  "supplier_id": null,
  "labor_ids": [2, 4, 5],
  "lead_labor_ids": [1, 4, 5],
  "recipient_user_ids": []
}
```

### Response Example

```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "notification": {
      "id": 123,
      "notification_title": "Job Update Notification",
      "message": "Your job has been assigned. Please check details.",
      "created_at": "2025-12-08T10:30:00Z"
    },
    "recipients": 5,
    "push_recipients": 3
  }
}
```

### Frontend Implementation Example

```javascript
// When user selects "Send to specific job" option and selects multiple jobs
const selectedJobs = [1, 2, 3]; // Job IDs selected

// Fetch labor_ids and lead_labor_ids from selected jobs
const laborIds = []; // Array to collect all labor IDs
const leadLaborIds = []; // Array to collect all lead labors IDs

// Get all labors and lead labors from selected jobs
selectedJobs.forEach(jobId => {
  // Add logic to fetch and collect labor_ids and lead_labor_ids
  // from each selected job
});

const payload = {
  notification_title: "Job Assignment",
  message: "You have been assigned to new jobs",
  custom_link: "/jobs",
  send_to_all: false, // ✅ HAMESHA false jab "specific job" select hota hai
  recipient_roles: [], // Empty array when using specific jobs
  labor_ids: laborIds, // e.g., [2, 4, 5]
  lead_labor_ids: leadLaborIds // e.g., [1, 4, 5]
};

// Make API call
fetch('/api/notification/sendNotification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
});
```

### Notes:

1. **`send_to_all` MUST be `false`**: Jab "Send to specific job" option select hota hai, to `send_to_all: false` **HAMESHA** bhejna hai ✅

2. **Both formats work**: You can send `labor_ids` and `lead_labor_ids` as:
   - Array: `[2, 4, 5]` ✅
   - String: `"[2,4,5]"` ✅

3. **At least one required**: Either `labor_ids` or `lead_labor_ids` must have at least one ID, OR `recipient_roles` must not be empty (when `send_to_all` is false)

4. **Duplicate handling**: If same user appears in both `labor_ids` and `lead_labor_ids`, they will receive notification only once

5. **User ID mapping**: The API automatically converts `labor_ids` and `lead_labor_ids` to corresponding `user_ids` from database

### Quick Reference:

| Option Selected | `send_to_all` Value |
|----------------|---------------------|
| "Send to all users" | `true` |
| "Send to specific roles" | `false` |
| **"Send to specific job"** | **`false`** ✅ |

