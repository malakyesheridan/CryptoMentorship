# Community Page Deep Performance Investigation & Fix Plan

## Critical Issues Identified

### 1. SSE Infinite Reconnection Loop (CRITICAL)
**Problem**: 
- `useSSE` hook has `onMessage`, `onTyping`, `onConnected` in dependency array
- These callbacks are recreated on every render
- Causes `connect()` to be recreated, triggering reconnection
- Results in constant reconnection attempts (orange flickering light)

**Root Cause**: 
```typescript
const connect = useCallback(() => {
  // ...
}, [channelId, session?.user?.id, onMessage, onTyping, onConnected])
// ❌ onMessage, onTyping, onConnected change on every render
```

**Fix**: Use `useRef` to store callbacks, remove from dependencies

### 2. API Calls Every 50ms
**Problem**: Terminal shows API calls every 50ms
**Root Causes**:
- SSE constantly reconnecting (each reconnect = new API call)
- SWR might be triggering refetches due to connection state changes
- `mutate()` calls might be triggering unnecessary refetches

### 3. 30s Delay to Load Messages
**Problem**: Messages take 30s to appear after sending
**Root Causes**:
- SSE not working (due to reconnection loop)
- App waiting for SWR `refreshInterval` (30s)
- Messages sent but not appearing via SSE, so waiting for next poll

### 4. Orange Flickering Connection Light
**Problem**: Connection indicator constantly flickering orange
**Root Cause**: SSE connection constantly disconnecting/reconnecting

## Solution Strategy

### Option A: Fix SSE Properly (Recommended)
1. Use `useRef` for callbacks in `useSSE` hook
2. Remove automatic reconnection on error
3. Add manual reconnect button if needed
4. Remove SWR `refreshInterval` (SSE handles real-time)
5. Ensure optimistic updates work correctly

### Option B: Remove SSE, Use Polling (Fallback)
1. Remove SSE entirely
2. Use SWR with 2-3 second polling
3. Simpler, more reliable, but less "real-time"

### Option C: Hybrid Approach
1. Use SSE for real-time updates
2. Fallback to polling if SSE fails
3. Best of both worlds

## Implementation Plan

I'll implement **Option A** (Fix SSE Properly) first, as it provides the best user experience when working correctly.

