/** Unknown historical dates sort after confirmed dates; they are never replaced by an event/today date. */
export function comparePublicationDates(a?: Date,b?: Date): number {
  if(!a)return b?1:0;
  if(!b)return -1;
  return b.getTime()-a.getTime();
}
