# Order CRUD API Documentation

## Base URL
`/api/orders`

All endpoints require authentication token in headers:
```
Authorization: Bearer <token>
```

---

## CREATE (Create Order)

### POST `/api/orders/createOrder`
Create a new order with cart items.

**Request Body:**
```json
{
  "lead_labour_id": 52,
  "customer_id": 30,
  "contractor_id": 21,
  "job_id": 21,
  "supplier_id": 24,
  "order_date": "2025-01-20",
  "delivery_address": "123 Main Street",
  "delivery_city_zip": "New York, NY 10001",
  "delivery_phone": "+1234567890",
  "created_from": "app",
  "status": "pending",
  "system_ip": "1234567",
  "notes": "Customer notes",
  "internal_notes": "Internal notes",
  "cartItems": [
    {
      "product_id": 135,
      "quantity": 5
    },
    {
      "product_id": 136,
      "quantity": 5
    },
    {
      "product_id": 137,
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-2025-001",
    ...
  },
  "statusCode": 201
}
```

**Features:**
- Automatically calculates subtotal, tax, discount, and total amount
- Deducts stock from products
- Creates order items from cart items

---

## READ (Get Orders)

### 1. GET `/api/orders/getAllOrders`
Get all orders with pagination and filters.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `sortBy` (default: 'created_at')
- `sortOrder` (default: 'desc')
- `status` - Filter by status
- `payment_status` - Filter by payment status
- `customer_id` - Filter by customer
- `contractor_id` - Filter by contractor
- `job_id` - Filter by job
- `supplier_id` - Filter by supplier
- `lead_labour_id` - Filter by lead labour
- `order_number` - Filter by order number
- `search` - Search in order fields

**Example:**
```
GET /api/orders/getAllOrders?page=1&limit=10&status=pending
```

---

### 2. GET `/api/orders/getOrderById/:id`
Get a single order by ID with all details.

**Path Parameters:**
- `id` (required) - Order ID

**Example:**
```
GET /api/orders/getOrderById/1
```

**Response:**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-2025-001",
    "items": [...],
    "customer": {...},
    "supplier": {...},
    ...
  },
  "statusCode": 200
}
```

---

### 3. GET `/api/orders/searchOrders`
Search orders with filters and pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` - Filter by status (use 'all' to get all statuses)
- `payment_status` - Filter by payment status
- `customer_id` - Filter by customer
- `contractor_id` - Filter by contractor
- `job_id` - Filter by job
- `supplier_id` - Filter by supplier
- `lead_labour_id` - Filter by lead labour
- `order_number` - Filter by order number
- `search` - Search term

**Example:**
```
GET /api/orders/searchOrders?status=all&page=1&limit=10
```

---

### 4. GET `/api/orders/getOrdersByCustomer/:customerId`
Get all orders for a specific customer.

**Path Parameters:**
- `customerId` (required) - Customer ID

---

### 5. GET `/api/orders/getOrdersByJob/:jobId`
Get all orders for a specific job.

**Path Parameters:**
- `jobId` (required) - Job ID

---

### 6. GET `/api/orders/getOrdersBySupplier/:supplierId`
Get all orders for a specific supplier.

**Path Parameters:**
- `supplierId` (required) - Supplier ID

---

### 7. GET `/api/orders/getOrderStats`
Get order statistics (total orders, by status, by payment status, etc.)

---

## UPDATE (Update Order)

### 1. POST `/api/orders/updateOrder/:id`
Update an existing order. Can update order fields and cart items.

**Path Parameters:**
- `id` (required) - Order ID

**Request Body:**
```json
{
  "lead_labour_id": 52,
  "customer_id": 30,
  "contractor_id": 21,
  "job_id": 21,
  "supplier_id": 24,
  "order_date": "2025-01-20",
  "delivery_address": "123 Main Street",
  "delivery_city_zip": "New York, NY 10001",
  "delivery_phone": "+1234567890",
  "status": "pending",
  "notes": "Updated notes",
  "cartItems": [
    {
      "product_id": 135,
      "quantity": 3
    },
    {
      "product_id": 136,
      "quantity": 2
    }
  ]
}
```

**Features:**
- If `cartItems` provided:
  - Restores stock for old order items
  - Deletes old order items
  - Creates new order items
  - Deducts stock for new items
  - Recalculates order totals
- Updates other order fields

**Response:**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {...},
  "statusCode": 200
}
```

---

### 2. PATCH `/api/orders/updateOrderStatus/:id`
Update only the order status.

**Path Parameters:**
- `id` (required) - Order ID

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Statuses:**
- `pending`
- `processing`
- `confirmed`
- `shipped`
- `delivered`
- `cancelled`
- `completed`

---

### 3. PATCH `/api/orders/updatePaymentStatus/:id`
Update only the payment status and payment method.

**Path Parameters:**
- `id` (required) - Order ID

**Request Body:**
```json
{
  "payment_status": "paid",
  "payment_method": "credit_card"
}
```

**Valid Payment Statuses:**
- `unpaid`
- `partial`
- `paid`
- `refunded`

---

### 4. POST `/api/orders/addOrderItem/:orderId`
Add a new item to an existing order.

**Path Parameters:**
- `orderId` (required) - Order ID

**Request Body:**
```json
{
  "product_id": 135,
  "quantity": 2
}
```

---

## DELETE (Delete Order)

### DELETE `/api/orders/deleteOrder/:id`
Delete an order and restore stock.

**Path Parameters:**
- `id` (required) - Order ID

**Example:**
```
DELETE /api/orders/deleteOrder/1
```

**Response:**
```json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": {
    "message": "Order deleted successfully",
    "deletedOrderId": 1
  },
  "statusCode": 200
}
```

**Features:**
- Restores stock for all order items (adds quantity back to product stock)
- Deletes all order items
- Deletes the order

---

### DELETE `/api/orders/removeOrderItem/:orderId/:itemId`
Remove a single item from an order.

**Path Parameters:**
- `orderId` (required) - Order ID
- `itemId` (required) - Order Item ID

**Features:**
- Restores stock for the removed item
- Updates order totals

---

## Order Status Values

### Order Status:
- `pending`
- `processing`
- `confirmed`
- `shipped`
- `delivered`
- `cancelled`
- `completed`

### Payment Status:
- `unpaid`
- `partial`
- `paid`
- `refunded`

---

## Error Responses

All endpoints return error responses in this format:
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400/404/500
}
```

---

## Notes

1. **Stock Management**: 
   - Creating/updating orders with items automatically deducts stock
   - Deleting orders or removing items automatically restores stock

2. **Order Totals**: 
   - Automatically calculated based on items, tax, and discount
   - Updated when items are added/removed

3. **Authentication**: 
   - All endpoints require authentication token
   - User ID is automatically captured from token for audit purposes

