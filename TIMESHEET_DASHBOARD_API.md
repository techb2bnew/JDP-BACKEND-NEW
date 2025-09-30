# 📊 Timesheet Dashboard Statistics API

## 🎯 Endpoint:
```
GET http://localhost:3000/api/job/getTimesheetDashboardStats
```

---

## 🚀 Quick CURL Command:

```bash
curl -X GET "http://localhost:3000/api/job/getTimesheetDashboardStats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✅ Response (Dashboard Cards Data):

```json
{
  "success": true,
  "message": "Timesheet dashboard statistics retrieved successfully",
  "data": {
    "total": 3,
    "pending": 1,
    "totalHours": "113h",
    "billableHours": "107h"
  }
}
```

---

## 📋 Dashboard Cards Mapping:

### 1. **Total Timesheets Card**
- **Value**: `data.total`
- **Example**: `3`
- **Description**: Total number of timesheets across all jobs

### 2. **Pending Approval Card**
- **Value**: `data.pending`
- **Example**: `1`
- **Description**: Number of timesheets awaiting approval

### 3. **Total Hours Card**
- **Value**: `data.totalHours`
- **Example**: `"113h"`
- **Description**: Sum of all recorded work hours

### 4. **Billable Hours Card**
- **Value**: `data.billableHours`
- **Example**: `"107h"`
- **Description**: Total hours that are approved and billable

---

## 🔧 How It Works:

1. **Fetches all jobs** with timesheet data from database
2. **Processes labor_timesheets** and **lead_labor_timesheets** JSONB fields
3. **Counts total timesheets** across all jobs
4. **Identifies pending timesheets** (status ≠ 'approved')
5. **Calculates total hours** from work_hours field
6. **Calculates billable hours** (only approved timesheets)

---

## 📊 Data Sources:

- **Jobs Table**: `labor_timesheets` and `lead_labor_timesheets` JSONB fields
- **Timesheet Structure**:
  ```json
  {
    "labor_id": 1,
    "labor_name": "John Doe",
    "date": "2024-01-15",
    "work_hours": "08:00:00",
    "status": "approved",
    "hourly_rate": 25.00
  }
  ```

---

## 🎨 Frontend Integration:

```javascript
// Fetch dashboard stats
const response = await fetch('/api/job/getTimesheetDashboardStats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

// Update dashboard cards
document.getElementById('total-timesheets').textContent = data.total;
document.getElementById('pending-approval').textContent = data.pending;
document.getElementById('total-hours').textContent = data.totalHours;
document.getElementById('billable-hours').textContent = data.billableHours;
```

---

## 🔐 Authentication Required:
- **JWT Token** in Authorization header
- **Middleware**: `authenticateToken`

---

## 📝 Notes:
- Uses existing timesheet infrastructure
- No new database tables required
- Integrates with existing Job model and routes
- Real-time data from jobs table
