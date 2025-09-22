# Timer API Examples for Mobile App

## Base URL
Replace `YOUR_SERVER_URL` with your actual server URL (e.g., `http://localhost:3000`)

## Authentication
All requests require a valid JWT token. Replace `YOUR_JWT_TOKEN` with your actual token.

## API Endpoint
**`POST /api/job/updateWorkData/:id`** - Updates work data including timers

---

## 1. Start Timer

```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "start_timer": "2024-01-15T09:00:00Z"
  }'
```

## 2. End Timer

```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "end_timer": "2024-01-15T17:00:00Z"
  }'
```

## 3. Pause Timer with Reason

### Lunch Break
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Lunch Break - Taking 30 minute lunch break"
  }'
```

### Material Pickup
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Material Pickup - Going to get supplies from warehouse"
  }'
```

### Customer Meeting
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Customer Meeting - Discussing project requirements"
  }'
```

### Equipment Issue
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Equipment Issue - Drill machine stopped working, waiting for repair"
  }'
```

### Weather Delay
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Weather Delay - Heavy rain, cannot work outside"
  }'
```

### Waiting for Parts
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Waiting for Parts - Need electrical components, delivery expected in 2 hours"
  }'
```

### Safety Break
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Safety Break - Mandatory safety break as per company policy"
  }'
```

### Other Reason
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Other - Personal emergency, need to leave for 1 hour"
  }'
```

---

## 4. Update Work Activity Count

```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "work_activity": 5
  }'
```

## 5. Update Total Work Time

```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "total_work_time": "07:30:45"
  }'
```

---

## 6. Update Multiple Fields Together

### Start Timer + Work Activity
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "start_timer": "2024-01-15T09:00:00Z",
    "work_activity": 1
  }'
```

### End Timer + Total Work Time + Work Activity
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "end_timer": "2024-01-15T17:00:00Z",
    "total_work_time": "08:00:00",
    "work_activity": 10
  }'
```

### Pause Timer + Work Activity
```bash
curl -X POST "YOUR_SERVER_URL/api/job/updateWorkData/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pause_timer": "Lunch Break - 30 minute break",
    "work_activity": 3
  }'
```

---

## 7. Get Work Activity History

```bash
curl -X GET "YOUR_SERVER_URL/api/job/getWorkActivityHistory/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Expected Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Work data updated successfully",
  "data": {
    "id": 1,
    "job_title": "Electrical Installation",
    "work_activity": 5,
    "total_work_time": "07:30:45",
    "start_timer": "2024-01-15T09:00:00Z",
    "end_timer": "2024-01-15T17:00:00Z",
    "pause_timer": "Lunch Break - 30 minute break",
    "updated_at": "2024-01-15T17:00:00Z"
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "At least one field is required",
  "error": "Bad Request"
}
```

---

## Available Pause Reasons:
- **Lunch Break** - For meal breaks
- **Material Pickup** - Getting supplies/materials
- **Customer Meeting** - Meeting with customer
- **Equipment Issue** - Equipment problems
- **Weather Delay** - Weather-related delays
- **Waiting for Parts** - Waiting for parts/supplies
- **Safety Break** - Mandatory safety breaks
- **Other** - Any other reason with custom notes

## Notes:
1. All timestamps should be in ISO 8601 format (e.g., `2024-01-15T09:00:00Z`)
2. `work_activity` should be a positive integer (1, 2, 3, etc.)
3. `total_work_time` should be in HH:MM:SS format
4. `pause_timer` can include both reason and additional notes
5. You can update multiple fields in a single API call
6. At least one field must be provided in each request
