export type Params<T extends string> = {
  params: Record<T, string>
}

export type SlugParams = Params<'slug'>
export type EventIdParams = Params<'eventId'>
export type TrackIdParams = Params<'trackId'>
export type SignalIdParams = Params<'signalId'>

