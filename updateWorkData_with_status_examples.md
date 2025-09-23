# Update Work Data API with Status Update

## Overview
The `updateWorkData` API now supports updating the job status along with work activity, timers, and other work-related fields.

## API Endpoint
```
POST /api/job/updateWorkData/:id
```

## New Feature: Status Update
You can now update the job status to any of these values:
- `draft`
- `active` 
- `in_progress`
- `completed`
- `cancelled`
- `on_hold`

## Test Examples

### 1. Update Status to Completed
```bash
curl -X POST "https://jdpbackend.prorevv.com/api/job/updateWorkData/15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "completed"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Work data updated successfully",
  "data": {
    "id": 15,
    "job_title": "Sample Job",
    "status": "completed",
    "work_activity": 5,
    "total_work_time": "02:30:45",
    "start_timer": "2024-01-15T09:00:00Z",
    "end_timer": "2024-01-15T17:00:00Z",
    "pause_timer": "[{\"title\":\"Lunch Break\",\"duration\":\"00:30:45\"}]",
    "updated_at": "2024-01-15T18:00:00Z"
  }
}
```

### 2. Update Multiple Fields Including Status
```bash
curl -X POST "https://jdpbackend.prorevv.com/api/job/updateWorkData/15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "work_activity": 10,
    "total_work_time": "08:15:30",
    "status": "in_progress",
    "end_timer": "2024-01-15T18:30:00Z"
  }'
```

### 3. Update Status with Pause Timer
```bash
curl -X POST "https://jdpbackend.prorevv.com/api/job/updateWorkData/15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "completed",
    "pause_timer": [
      {
        "title": "Equipment Maintenance",
        "duration": "00:45:00"
      }
    ]
  }'
```

### 4. Invalid Status (Error Example)
```bash
curl -X POST "https://jdpbackend.prorevv.com/api/job/updateWorkData/15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "invalid_status"
  }'
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: draft, active, in_progress, completed, cancelled, on_hold"
}
```

## Complete Request Body Options

```json
{
  "work_activity": 5,
  "total_work_time": "02:30:45",
  "start_timer": "2024-01-15T09:00:00Z",
  "end_timer": "2024-01-15T17:00:00Z",
  "status": "completed",
  "pause_timer": [
    {
      "title": "Lunch Break",
      "duration": "00:30:45"
    },
    {
      "title": "Equipment Issue",
      "duration": "00:15:30"
    }
  ]
}
```

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `work_activity` | integer | Number of work activities | `5` |
| `total_work_time` | string | Total work time (HH:MM:SS) | `"02:30:45"` |
| `start_timer` | string | Start timestamp (ISO format) | `"2024-01-15T09:00:00Z"` |
| `end_timer` | string | End timestamp (ISO format) | `"2024-01-15T17:00:00Z"` |
| `status` | string | Job status | `"completed"` |
| `pause_timer` | array | Array of pause objects | `[{"title": "Break", "duration": "00:30:00"}]` |

## Valid Status Values

- **`draft`** - Job is in draft state
- **`active`** - Job is active and ready to start
- **`in_progress`** - Job is currently being worked on
- **`completed`** - Job has been completed
- **`cancelled`** - Job has been cancelled
- **`on_hold`** - Job is temporarily on hold

## Benefits

1. **Unified API**: Update work data and status in one request
2. **Validation**: Status values are validated against allowed options
3. **Flexibility**: Can update any combination of fields
4. **Mobile Friendly**: Perfect for mobile app status updates
5. **Data Integrity**: All updates are validated and logged

## Use Cases

- **Complete a job**: Set status to "completed" when work is done
- **Start work**: Set status to "in_progress" when starting
- **Pause work**: Set status to "on_hold" when pausing
- **Cancel job**: Set status to "cancelled" if needed
- **Update progress**: Combine status with work activity and time updates

This enhancement makes the API more powerful and suitable for comprehensive job management workflows! 🚀
