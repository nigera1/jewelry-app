# Contributing Guide

## Development Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/nigera1/jewelry-app.git
   cd jewelry-app
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.local.example .env.local
   # Add your Supabase credentials
   ```

3. **Start development**
   ```bash
   npm run dev
   # App runs at http://localhost:3000
   ```

## Code Standards

### TypeScript

- **Strict mode**: All files compiled with `strict: true`
- **No `any`**: Use proper types instead of `any`
- **Explicit returns**: Functions must have return types

```typescript
// ❌ Bad
function processOrder(order) {
  return order
}

// ✅ Good
function processOrder(order: Order): Promise<Order> {
  return OrderDAO.updateOrder(order.id, order)
}
```

### Error Handling

Always handle errors explicitly:

```typescript
// ❌ Bad - silent failure
try {
  await OrderDAO.getOrder(id)
} catch (err) {
  // Do nothing
}

// ✅ Good - proper handling
try {
  const order = await OrderDAO.getOrder(id)
} catch (err) {
  const error = handleError(err)
  logger.error(error, 'Failed to fetch order')
  throw err
}
```

### Logging

Use structured logging:

```typescript
// ❌ Bad
console.log('Order created: ' + order.id)

// ✅ Good
logger.info({ orderId: order.id }, 'Order created')
```

### React Components

- **Use TypeScript** for all new components
- **Use functional components** with hooks
- **Add JSDoc comments** for complex components

```typescript
// ✅ Good component structure
interface OrderCardProps {
  order: Order
  onUpdate?: (order: Order) => void
}

/**
 * Displays a single order card with status and actions
 * @param order - The order to display
 * @param onUpdate - Callback when order is updated
 */
export function OrderCard({ order, onUpdate }: OrderCardProps) {
  // Implementation
}
```

### Testing

Write tests for:
- ✅ Validation schemas
- ✅ Error handling
- ✅ Critical business logic
- ✅ Components with complex state
- ✅ Custom hooks

```bash
npm run test         # Run all tests
npm run test:watch   # Watch mode during development
```

## File Organization

### For New Features

```
app/(protected)/feature-name/
├── page.tsx                 # Main page
├── layout.tsx              # Layout (if needed)
├── components/
│   ├── FeatureForm.tsx
│   ├── FeatureList.tsx
│   └── index.tsx
├── hooks/
│   ├── useFeature.ts
│   ├── useFeatureForm.ts
│   └── index.ts
├── constants/
│   ├── index.ts
│   └── types.ts
└── __tests__/
    ├── useFeature.test.ts
    └── components.test.tsx
```

### Import Aliases

Always use `@/` path alias:

```typescript
// ❌ Bad
import { logger } from '../../../lib/logger'

// ✅ Good
import { logger } from '@/lib/logger'
```

## Database Changes

1. Make changes in Supabase dashboard
2. Document schema in `DATABASE.md`
3. Update validation schemas in `lib/validation.ts`
4. Update types in `lib/types.ts`
5. Update DAOs in `lib/data-access.ts`

## Commit Messages

Follow conventional commits:

```
feat: Add rush order filtering
fix: Handle cooldown timer reset
docs: Update architecture guide
test: Add validation tests
refactor: Extract API response helper
```

## Pull Request Checklist

- [ ] Types are correct (`npm run type-check`)
- [ ] No lint errors (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Formatted properly (`npm run lint:fix`)
- [ ] Documentation updated if needed
- [ ] No `console.log` statements
- [ ] No hardcoded values
- [ ] Error handling is comprehensive

## Performance Guidelines

### Do's ✅
- Use React Query for data fetching
- Memoize expensive computations with `useMemo`
- Use `useCallback` for event handlers in lists
- Lazy load components with `React.lazy()`
- Implement pagination for large lists
- Use database indexes for common queries

### Don'ts ❌
- Don't fetch all data without limits
- Don't make network requests in render
- Don't ignore loading/error states
- Don't bypass validation schemas
- Don't suppress TypeScript errors with `// @ts-ignore`
- Don't commit console.log statements

## Security Guidelines

### Authentication
- Always validate session in protected routes
- Use Supabase auth for all user operations
- Never expose API keys in client code

### Data Validation
- Validate all inputs with Zod schemas
- Sanitize user-submitted content
- Use prepared queries (handled by Supabase)

### Error Messages
- Never expose internal error details to users
- Log full errors on server for debugging
- Show user-friendly error messages

## Debugging

### Enable Debug Logging
```bash
DEBUG=* npm run dev
```

### Browser DevTools
- React DevTools: Inspect components and hooks
- Network tab: Monitor API calls and React Query state
- Console: View structured logs

### Server Logs
- Terminal shows all server-side logs
- Each request shows duration and status
- Errors include full stack traces

## Common Tasks

### Add a New Validation Rule
```typescript
// 1. Add to lib/validation.ts
export const CustomSchema = z.object({
  field: z.string().custom((val) => {
    // Custom validation logic
    return true
  }),
})

// 2. Use in hook or component
const validation = validateData(data, CustomSchema)
```

### Add a New Database Query
```typescript
// 1. Add DAO method in lib/data-access.ts
async getCustomData(filter: string) {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('filter', filter)
  // Error handling...
  return data
}

// 2. Use in hook with React Query
const { data } = useQuery({
  queryKey: ['custom', filter],
  queryFn: () => DAO.getCustomData(filter),
})
```

### Add a New API Route
```typescript
// 1. Create app/api/route.ts
// 2. Use error handling wrapper
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const data = await fetchData()
    return successResponse(data)
  })
}
```

## Performance Profiling

### Build Analysis
```bash
npm run build
# Review .next/static analysis in build output
```

### Runtime Performance
- Use Chrome DevTools Performance tab
- Profile components with React DevTools Profiler
- Check Network waterfall for slow requests

## Deployment

See `DEPLOYMENT.md` for production deployment steps and checklist.

## Need Help?

1. Check existing documentation: `ARCHITECTURE.md`, `DATABASE.md`
2. Review similar components/hooks in codebase
3. Check tests for usage examples
4. Create an issue for bugs or questions

## Code Review Process

- All PRs require 1 approval
- TypeScript and tests must pass
- Linting must pass (`npm run lint`)
- Be respectful and constructive in feedback
