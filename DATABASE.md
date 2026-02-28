# Database Schema & Optimization Guide

## Current Tables

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100) NOT NULL,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'entry',
  is_rush BOOLEAN DEFAULT FALSE,
  is_external BOOLEAN DEFAULT FALSE,
  timer_started_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes for optimization:**
```sql
-- Primary access pattern
CREATE INDEX idx_orders_current_stage ON orders(current_stage);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_is_rush ON orders(is_rush) WHERE is_rush = TRUE;

-- Composite indexes for common filters
CREATE INDEX idx_orders_stage_rush ON orders(current_stage, is_rush);

-- Full-text search (optional)
CREATE INDEX idx_orders_client_search ON orders USING GIN(to_tsvector('english', client_name));
```

### production_logs
```sql
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  staff_member VARCHAR(100) NOT NULL,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  redo_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes for optimization:**
```sql
-- Primary access pattern
CREATE INDEX idx_prod_logs_order_id ON production_logs(order_id);
CREATE INDEX idx_prod_logs_created_at ON production_logs(created_at DESC);
CREATE INDEX idx_prod_logs_stage ON production_logs(stage);

-- For analytics queries
CREATE INDEX idx_prod_logs_stage_created ON production_logs(stage, created_at DESC);

-- Partial index for failed orders
CREATE INDEX idx_prod_logs_failed ON production_logs(order_id)
  WHERE redo_reason IS NOT NULL;
```

## Query Patterns & Optimization

### 1. Fetch Active Orders by Stage (Most Common)
```typescript
// ✅ Optimized with index
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('current_stage', 'casting')
  .order('created_at', { ascending: false })

// Add limit to avoid fetching too many rows
.limit(100)
```

**Index helps:** ✅ idx_orders_current_stage

### 2. Get Rush Orders
```typescript
// ✅ Optimized
const rushOrders = await supabase
  .from('orders')
  .select('*')
  .eq('is_rush', true)
  .limit(50)
```

**Index helps:** ✅ idx_orders_is_rush

### 3. Analytics: Stage Duration Average
```typescript
// ✅ Optimized with index and limit
const stats = await supabase
  .from('production_logs')
  .select('stage, duration_ms')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .limit(10000) // Prevent huge result sets
```

**Index helps:** ✅ idx_prod_logs_stage_created

### 4. Production Timeline for Order
```typescript
// ✅ Optimized
const logs = await supabase
  .from('production_logs')
  .select('*')
  .eq('order_id', orderId)
  .order('created_at', { ascending: false })
```

**Index helps:** ✅ idx_prod_logs_order_id

## Performance Recommendations

### 1. Always Use Limits
```typescript
// ❌ Bad - can fetch thousands of rows
.select('*')

// ✅ Good - limit result set
.select('*').limit(100)
```

### 2. Select Only Needed Columns
```typescript
// ❌ Bad
.select('*')

// ✅ Good
.select('id, client_name, current_stage, created_at')
```

### 3. Use Pagination for Large Sets
```typescript
const pageSize = 50
const offset = (pageNumber - 1) * pageSize

const { data, error, count } = await supabase
  .from('orders')
  .select('*', { count: 'exact' })
  .range(offset, offset + pageSize - 1)
```

### 4. Batch Operations When Possible
```typescript
// ✅ Batch insert
await OrderDAO.insertMany([order1, order2, order3])

// Instead of individual inserts
```

### 5. Monitor Slow Queries
```typescript
// Enable query logging in Supabase dashboard
// Set slow query threshold to 100ms
// Review regularly in Edge Functions logs
```

## Caching Strategy

### Query Caching Times
```typescript
// Cache configuration by data type
const cache = {
  activeOrders: 5 * 60 * 1000,      // 5 min - changes frequently
  orderDetail: 3 * 60 * 1000,        // 3 min - accessed often
  productionLogs: 2 * 60 * 1000,     // 2 min - append-only
  analytics: 15 * 60 * 1000,         // 15 min - expensive to calculate
}
```

### Invalidation Triggers
```typescript
// Invalidate when:
// - New order created → invalidate activeOrders
// - Order updated → invalidate orderDetail(id) + activeOrders
// - Production log added → invalidate productionLogs(orderId) + analytics
```

## Migration Checklist

- [x] Create indexes on all frequently queried columns
- [x] Add foreign key constraints with CASCADE
- [x] Set up RLS (Row-Level Security) policies if needed
- [x] Configure automatic backups
- [ ] Set up query monitoring and alerts
- [ ] Regular slow query analysis
- [ ] Archive old data (>1 year) to reduce table size
- [ ] Test disaster recovery procedures

## Supabase Dashboard Tips

1. **Query Performance**: Monitor in Dashboard → Database → Query Performance
2. **Indexes**: View all indexes in Dashboard → Database → Indexes
3. **Backups**: Configure automatic daily backups
4. **Replication**: Enable read replicas for high-traffic deployments
5. **Row-Level Security**: Implement RLS policies for data isolation

## Data Retention Policy

```typescript
// Archive orders older than 2 years
// Keep production logs for 5 years (compliance)
// Delete temporary/test data weekly

// Example cleanup:
const archiveDate = new Date()
archiveDate.setFullYear(archiveDate.getFullYear() - 2)

await supabase
  .from('orders')
  .delete()
  .lt('created_at', archiveDate.toISOString())
  .not('current_stage', 'eq', 'completed') // Keep completed orders
```
