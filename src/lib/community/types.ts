export type Channel = {
  id: string
  name: string
  description?: string | null
  createdAt: string
}

export type ChatAuthor = {
  id: string
  name: string | null
  image: string | null
}

export type ChatMessage = {
  id: string
  channelId: string
  userId: string
  body: string
  createdAt: string
  author: ChatAuthor
}

export type ListChannelsResponse = {
  ok: true
  items: Channel[]
}

export type ListMessagesResponse = {
  ok: true
  items: ChatMessage[]
}

export type CreateMessageBody = {
  channelId: string
  body: string
}

export type CreateMessageResponse = {
  ok: true
  item: ChatMessage
}

export type CreateChannelBody = {
  name: string
  description?: string
}

export type CreateChannelResponse = {
  ok: true
  item: Channel
}

export type ApiError = {
  ok: false
  code: string
  message: string
}
