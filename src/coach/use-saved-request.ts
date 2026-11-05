import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { bookingStorage } from '@/booking/storage';
import { persistRequest, readSavedRequest, type SavedRequest } from './request';
import { AuthError, sanitizeAuthError } from '@/auth/errors';
export function useSavedRequest<T>(owner: string, kind: string) {
  const scope = useRef({owner,active:true});
  useEffect(()=>{scope.current={owner,active:true};return()=>{scope.current.active=false}},[owner]);
  const assertCurrent=()=>{if(!scope.current.active||scope.current.owner!==owner)throw new AuthError('cancelled','The coaching account changed. Reopen this workspace before continuing.');};
  const key = `zawana.staff.${owner}.${kind}`;
  const [state,setState] = useState<{ key: string; pending: SavedRequest<T> | null; error: string | null } | null>(null);
  useEffect(() => { let active = true; void bookingStorage.getItem(key).then(raw => { if(active) setState({key,pending:raw ? readSavedRequest<T>(raw) : null,error:null}); }).catch(e => {if(active)setState({key,pending:null,error:sanitizeAuthError(e).message});});return()=>{active=false}; },[key]);
  return { assertCurrent, pending: state?.key === key ? state.pending : null, restoring: state?.key !== key, error: state?.key === key ? state.error : null,
    async prepare(input:T) { assertCurrent(); const saved = await persistRequest(bookingStorage,key,input,randomUUID);assertCurrent();setState({key,pending:saved,error:null});return saved; },
    async clear() { await bookingStorage.removeItem(key);setState({key,pending:null,error:null}); }
  };
}
