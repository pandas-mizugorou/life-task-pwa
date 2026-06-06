// Board scroll positions kept across the route remount that opening a task detail
// causes. Module-scoped, so they survive the remount for the session and reset only
// on a full reload. `left` = the column row's horizontal offset; `tops` = each
// column's vertical offset, keyed by status (plus the completed column).
export const boardScroll = {
  left: 0,
  tops: new Map<string, number>(),
}
