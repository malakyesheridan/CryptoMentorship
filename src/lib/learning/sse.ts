// Store active connections by user for learning progress updates
const userConnections = new Map<string, Set<ReadableStreamDefaultController>>()
const trackConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Function to broadcast progress update to user's own connections
export function broadcastUserProgress(userId: string, progress: any) {
  const connections = userConnections.get(userId)
  if (!connections) return

  const data = JSON.stringify({
    type: 'progress_update',
    ...progress,
    timestamp: new Date().toISOString()
  })

  const eventData = `data: ${data}\n\n`

  // Send to all user's connections
  for (const controller of Array.from(connections)) {
    try {
      controller.enqueue(eventData)
    } catch (error) {
      // Remove failed connections
      connections.delete(controller)
    }
  }

  // Clean up empty user connections
  if (connections.size === 0) {
    userConnections.delete(userId)
  }
}

// Function to broadcast track progress to all enrolled users
export function broadcastTrackProgress(trackId: string, progress: any) {
  const connections = trackConnections.get(trackId)
  if (!connections) return

  const data = JSON.stringify({
    type: 'track_progress',
    trackId,
    ...progress,
    timestamp: new Date().toISOString()
  })

  const eventData = `data: ${data}\n\n`

  for (const controller of Array.from(connections)) {
    try {
      controller.enqueue(eventData)
    } catch (error) {
      connections.delete(controller)
    }
  }

  // Clean up empty track connections
  if (connections.size === 0) {
    trackConnections.delete(trackId)
  }
}

// Function to broadcast achievement to user
export function broadcastAchievement(userId: string, achievement: any) {
  const connections = userConnections.get(userId)
  if (!connections) return

  const data = JSON.stringify({
    type: 'achievement',
    ...achievement,
    timestamp: new Date().toISOString()
  })

  const eventData = `data: ${data}\n\n`

  for (const controller of Array.from(connections)) {
    try {
      controller.enqueue(eventData)
    } catch (error) {
      connections.delete(controller)
    }
  }
}

// Function to add a user connection
export function addUserConnection(userId: string, controller: ReadableStreamDefaultController) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set())
  }
  userConnections.get(userId)!.add(controller)
}

// Function to add a track connection
export function addTrackConnection(trackId: string, controller: ReadableStreamDefaultController) {
  if (!trackConnections.has(trackId)) {
    trackConnections.set(trackId, new Set())
  }
  trackConnections.get(trackId)!.add(controller)
}

// Function to remove a user connection
export function removeUserConnection(userId: string, controller: ReadableStreamDefaultController) {
  const connections = userConnections.get(userId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      userConnections.delete(userId)
    }
  }
}

// Function to remove a track connection
export function removeTrackConnection(trackId: string, controller: ReadableStreamDefaultController) {
  const connections = trackConnections.get(trackId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      trackConnections.delete(trackId)
    }
  }
}

// Function to get connection counts for monitoring
export function getConnectionStats() {
  return {
    userConnections: userConnections.size,
    trackConnections: trackConnections.size,
    totalConnections: Array.from(userConnections.values()).reduce((sum, set) => sum + set.size, 0) +
                     Array.from(trackConnections.values()).reduce((sum, set) => sum + set.size, 0)
  }
}
