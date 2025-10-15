// Store active connections by channel
const channelConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Function to broadcast message to all connections in a channel
export function broadcastMessage(channelId: string, message: any) {
  const connections = channelConnections.get(channelId)
  if (!connections) return

  const data = JSON.stringify({
    type: 'message',
    ...message,
    timestamp: new Date().toISOString()
  })

  const eventData = `data: ${data}\n\n`

  // Send to all connections
  for (const controller of Array.from(connections)) {
    try {
      controller.enqueue(eventData)
    } catch (error) {
      // Remove failed connections
      connections.delete(controller)
    }
  }

  // Clean up empty channel
  if (connections.size === 0) {
    channelConnections.delete(channelId)
  }
}

// Function to broadcast typing indicator
export function broadcastTyping(channelId: string, userId: string, userName: string, isTyping: boolean) {
  const connections = channelConnections.get(channelId)
  if (!connections) return

  const data = JSON.stringify({
    type: 'typing',
    userId,
    userName,
    isTyping,
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

// Function to add a connection to a channel
export function addConnection(channelId: string, controller: ReadableStreamDefaultController) {
  if (!channelConnections.has(channelId)) {
    channelConnections.set(channelId, new Set())
  }
  channelConnections.get(channelId)!.add(controller)
}

// Function to remove a connection from a channel
export function removeConnection(channelId: string, controller: ReadableStreamDefaultController) {
  const connections = channelConnections.get(channelId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      channelConnections.delete(channelId)
    }
  }
}
