# JDP Backend API

A comprehensive backend API built with Fastify and Supabase for managing users, staff, labor, and suppliers with role-based access control.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control
- 👥 **User Management**: Complete CRUD operations for users with different roles
- 👨‍💼 **Staff Management**: Manage staff members with detailed information
- 🏗️ **Labor Management**: Handle labor workers with skills, permissions, and supervisor relationships
- 🏪 **Supplier Management**: Manage suppliers with company details and status tracking
- 🎛️ **Dynamic Role & Permission Management**: Comprehensive permission system with granular access control
- 🛡️ **Security**: Password hashing, input validation, and secure middleware
- 📊 **Database**: PostgreSQL with Supabase for scalable data storage

## Roles & Permissions

### Super Admin
- Full access to all features
- Can manage all users, staff, labor, and suppliers
- Can create other super admins and admins

### Admin
- Can manage users, staff, labor, and suppliers
- Cannot create super admins
- Limited administrative access

### Staff
- Basic user access
- Can view their own profile and update personal information

### Labor
- Worker access with specific permissions
- Can have various job-related permissions (create jobs, add clients, etc.)

### Lead Labor
- Senior labor with additional permissions
- Can supervise other labor workers

### Supplier
- External supplier access
- Can view and update their company information

### Contractor
- External contractor access
- Can view assigned jobs and receive notifications via email

### Customer
- End customer access
- Can receive final invoices only

## Database Schema

The application uses the following main tables:

- **users**: Core user information with roles and status
- **staff**: Staff-specific information linked to users
- **labor**: Labor worker details with skills and permissions
- **suppliers**: Supplier company information and status
- **permissions**: Available permissions in the system
- **role_permissions**: Role-to-permission mappings with conditions
- **user_permissions**: User-specific permission overrides

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register a new user | No |
| POST | `/login` | User login | No |
| POST | `/change-password` | Change user password | Yes |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |

### Admin Management (`/api/admin`)

#### User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/users` | Create a new user | Admin |
| GET | `/users` | Get all users | Admin |
| GET | `/users/:id` | Get user by ID | Admin |
| PUT | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete user | Admin |
| PATCH | `/users/:id/status` | Update user status | Admin |

#### Staff Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/staff` | Create staff member | Admin |
| GET | `/staff` | Get all staff | Admin |
| GET | `/staff/:id` | Get staff by ID | Admin |
| PUT | `/staff/:id` | Update staff | Admin |
| DELETE | `/staff/:id` | Delete staff | Admin |

#### Labor Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/labor` | Create labor worker | Admin |
| GET | `/labor` | Get all labor | Admin |
| GET | `/labor/:id` | Get labor by ID | Admin |
| PUT | `/labor/:id` | Update labor | Admin |
| DELETE | `/labor/:id` | Delete labor | Admin |

#### Supplier Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/suppliers` | Create supplier | Admin |
| GET | `/suppliers` | Get all suppliers | Admin |
| GET | `/suppliers/:id` | Get supplier by ID | Admin |
| PUT | `/suppliers/:id` | Update supplier | Admin |
| DELETE | `/suppliers/:id` | Delete supplier | Admin |
| PATCH | `/suppliers/:id/status` | Update supplier status | Admin |

### Permission Management (`/api/admin`)

#### Permission Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/permissions` | Get all permissions | Admin |
| POST | `/permissions` | Create new permission | Admin |
| PUT | `/permissions/:id` | Update permission | Admin |
| DELETE | `/permissions/:id` | Delete permission | Admin |

#### Role Permission Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/roles/:role/permissions` | Get role permissions | Admin |
| PUT | `/roles/:role/permissions` | Update role permissions | Admin |
| GET | `/permission-matrix` | Get permission matrix | Admin |
| GET | `/role-permissions` | Get all role permissions | Admin |

#### User Permission Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/:userId/permissions` | Get user permissions | Admin |
| PUT | `/users/:userId/permissions` | Update user permissions | Admin |

#### Dashboard & Utilities
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard/stats` | Get dashboard statistics | Admin |
| POST | `/permissions/bulk-update` | Bulk update permissions | Admin |
| GET | `/permissions/export` | Export permission matrix | Admin |
| POST | `/permissions/import` | Import permission matrix | Admin |

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

### 1. Clone the repository

```bash
git clone <repository-url>
cd JDP-Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Database Setup

Run the SQL schema from `database/schema.sql` in your Supabase SQL editor to create the required tables. The permission system will be automatically initialized when the server starts.

### 5. Start the server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Permission System

The application includes a comprehensive dynamic role and permission management system that allows administrators to:

- **Create and manage permissions**: Define custom permissions with categories, actions, and resources
- **Assign permissions to roles**: Map permissions to roles with conditional access
- **User-specific overrides**: Grant or deny specific permissions to individual users
- **Bulk operations**: Update multiple permissions at once
- **Export/Import**: Backup and restore permission configurations
- **Permission checking**: Verify user permissions in real-time

### Permission Categories

- **jobs**: Job management permissions
- **invoices**: Invoice management permissions  
- **time_materials**: Time and materials permissions
- **suppliers**: Supplier management permissions
- **reports**: Report viewing permissions
- **pricing**: Price visibility permissions
- **users**: User management permissions
- **notifications**: Notification permissions

### Using Permissions in Your Code

```javascript
// Require a specific permission
app.get('/jobs', requirePermission('view_all_jobs'), jobsController.getAllJobs);

// Require any of multiple permissions
app.post('/jobs', requireAnyPermission(['create_jobs', 'edit_jobs']), jobsController.createJob);

// Require all permissions
app.put('/jobs/:id', requireAllPermissions(['edit_jobs', 'modify_job_type']), jobsController.updateJob);

// Require specific role
app.delete('/jobs/:id', requireRole(['admin', 'super_admin']), jobsController.deleteJob);
```

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## API Usage Examples

### Register a Super Admin

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Super Admin",
    "email": "admin@example.com",
    "password": "password123",
    "role": "super_admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Create Staff Member (Admin only)

```bash
curl -X POST http://localhost:3000/api/admin/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 2,
    "position": "Manager",
    "department": "Operations",
    "date_of_joining": "2024-01-15",
    "address": "123 Main St, City"
  }'
```

### Create Labor Worker (Admin only)

```bash
curl -X POST http://localhost:3000/api/admin/labor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 3,
    "labor_code": "LAB001",
    "dob": "1990-05-15",
    "address": "456 Worker St, City",
    "department": "Construction",
    "date_of_joining": "2024-01-20",
    "specialization": "Electrical",
    "trade": "Electrician",
    "experience": "5 years",
    "hourly_rate": 25.50
  }'
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation using Joi schemas
- **Role-based Access Control**: Granular permissions based on user roles
- **CORS Protection**: Configurable CORS settings
- **Error Handling**: Secure error responses without exposing sensitive information

## Development

### Project Structure

```
src/
├── config/
│   └── database.js          # Database configuration
├── constants/
│   └── roles.js             # Role and status constants
├── controllers/
│   ├── authController.js    # Authentication controller
│   ├── userController.js    # User management controller
│   └── adminController.js   # Admin permission management controller
├── helpers/
│   ├── authHelper.js        # Authentication utilities
│   └── responseHelper.js    # Response formatting
├── middleware/
│   ├── authMiddleware.js    # Authentication middleware
│   └── permissionMiddleware.js # Permission checking middleware
├── models/
│   ├── User.js              # User model
│   ├── Staff.js             # Staff model
│   ├── Labor.js             # Labor model
│   ├── Supplier.js          # Supplier model
│   ├── Permission.js        # Permission model
│   └── RolePermission.js    # Role-permission model
├── routes/
│   ├── authRoutes.js        # Authentication routes
│   ├── userRoutes.js        # User management routes
│   └── adminRoutes.js       # Admin permission management routes
├── services/
│   ├── authService.js       # Authentication service
│   ├── userService.js       # User management service
│   └── adminService.js      # Admin permission management service
├── utils/
│   ├── helpers.js           # Utility functions
│   ├── setupPermissions.js  # Permission system setup
│   └── testConnection.js    # Database connection test
├── validations/
│   ├── authValidation.js    # Authentication validation
│   └── userValidation.js    # User validation
└── server.js                # Main server file
```

### Adding New Features

1. **Models**: Create new model files in `src/models/`
2. **Services**: Add business logic in `src/services/`
3. **Controllers**: Handle HTTP requests in `src/controllers/`
4. **Routes**: Define API endpoints in `src/routes/`
5. **Validation**: Add validation schemas in `src/validations/`

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Environment Variables

Ensure all required environment variables are set in your production environment:

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `JWT_SECRET`: Secret key for JWT tokens
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Production Considerations

- Use a strong JWT secret
- Enable HTTPS in production
- Set up proper CORS origins
- Configure database connection pooling
- Set up monitoring and logging
- Use environment-specific configurations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

#   J D P - B A C K E N D - N E W  
 