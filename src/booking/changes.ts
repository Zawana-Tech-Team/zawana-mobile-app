import { AuthError } from '../auth/errors.ts';
import { reservation } from './validation.ts';
import type { Reservation } from './types.ts';
export type CourtTarget = { date: string; time: string; courtId: string };
export type CourtChangeDetail = {
  booking: Reservation;
  customer?: string;
  eligibility: { eligible: boolean; message: string; deadline?: string };
  revision: string;
  history: { id: string; action: string; reason: string; createdAt: string }[];
  cancellations: { id: string; status: string; reason: string; refundStatus: string }[];
  cancellationPolicy: { message: string };
};
export type CourtChangeQuote = { revision: string; difference: number; proposed: CourtTarget & { courtName: string; price: number; available: boolean }; original: CourtTarget & { price: number } };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const invalid = (): never => { throw new AuthError('invalidResponse', 'Could not read the reservation change. Please refresh.'); };
export function courtChangeDetail(v: unknown): CourtChangeDetail {
  if (!object(v)) return invalid();
  reservation(v.booking);
  if (v.customer !== undefined && !text(v.customer)) return invalid();
  if (!object(v.eligibility) || typeof v.eligibility.eligible !== 'boolean' || !text(v.eligibility.message) || !text(v.revision) || !Array.isArray(v.history) || !Array.isArray(v.cancellations) || !object(v.cancellationPolicy) || !text(v.cancellationPolicy.message)) return invalid();
  if (v.history.some(h => !object(h) || !['id','action','reason','createdAt'].every(k => text(h[k]))) || v.cancellations.some(c => !object(c) || !['id','status','reason','refundStatus'].every(k => text(c[k])))) return invalid();
  return v as CourtChangeDetail;
}
export function courtChangeQuote(v: unknown): CourtChangeQuote {
  const target = (x: unknown) => object(x) && ['date','time','courtId'].every(k => text(x[k])) && typeof x.price === 'number' && Number.isSafeInteger(x.price) && x.price >= 0;
  if (!object(v) || !text(v.revision) || typeof v.difference !== 'number' || !Number.isSafeInteger(v.difference) || !target(v.proposed) || !target(v.original) || !object(v.proposed) || !text(v.proposed.courtName) || typeof v.proposed.available !== 'boolean') return invalid();
  return v as CourtChangeQuote;
}
/** Read after an ambiguous response; never blindly repeat a reservation mutation. */
export async function commitCourtChange(api: {
  rescheduleCourt: (id: string, input: CourtTarget & { revision: string; reason: string }) => Promise<Reservation>;
  getCourtChangeDetail: (id: string) => Promise<CourtChangeDetail>;
}, id: string, input: CourtTarget & { revision: string; reason: string }) {
  try { return await api.rescheduleCourt(id, input); }
  catch (error) {
    if (!(error instanceof AuthError) || !['network','timeout','bookingConflict'].includes(error.code)) throw error;
    const current = await api.getCourtChangeDetail(id).catch(() => null);
    if (current && current.booking.date === input.date && current.booking.time === input.time && current.booking.courtId === input.courtId) return current.booking;
    throw error;
  }
}

export function courtCancellation(v: unknown) {
  if (!object(v) || !['id','status','reason','refundStatus'].every(k => text(v[k]))) return invalid();
  return v as { id: string; status: string; reason: string; refundStatus: string };
}
