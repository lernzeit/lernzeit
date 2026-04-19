import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { triggerCelebrationConfetti } from '@/utils/confetti';

export interface ScreenTimeRequest {
  id: string;
  child_id: string;
  parent_id: string;
  requested_minutes: number;
  earned_minutes: number;
  request_message?: string;
  status: 'pending' | 'approved' | 'denied';
  parent_response?: string;
  created_at: string;
  responded_at?: string;
  expires_at: string;
  parent_count?: number;
}

interface UseScreenTimeRequestsResult {
  requests: ScreenTimeRequest[];
  loading: boolean;
  createRequest: (parentId: string, requestedMinutes: number, earnedMinutes: number, message?: string) => Promise<{ success: boolean; request?: ScreenTimeRequest; deep_links?: any; validation?: any; error?: string }>;
  respondToRequest: (requestId: string, status: 'approved' | 'denied', response?: string) => Promise<{ success: boolean; error?: string }>;
  refreshRequests: () => Promise<void>;
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const errorWithContext = error as {
      context?: {
        clone?: () => {
          json: () => Promise<unknown>;
          text: () => Promise<string>;
        };
      };
      message?: string;
    };

    const responseLike = errorWithContext.context;

    if (responseLike && typeof responseLike.clone === 'function') {
      try {
        const payload = await responseLike.clone().json() as { error?: unknown };
        if (typeof payload?.error === 'string' && payload.error.trim()) {
          return payload.error;
        }
      } catch {
        // ignore JSON parsing errors and try text fallback
      }

      try {
        const text = await responseLike.clone().text();
        if (text.trim()) {
          return text;
        }
      } catch {
        // ignore text parsing errors and use message fallback
      }
    }

    if (typeof errorWithContext.message === 'string' && errorWithContext.message.trim()) {
      return errorWithContext.message;
    }
  }

  return fallback;
}

// Two requests are considered the same logical request (broadcast to multiple parents)
// if they share the same child, requested minutes and message, and were created within 5s.
// Status is intentionally NOT compared so we can merge across parents who responded differently.
function shouldMergeChildRequests(a: ScreenTimeRequest, b: ScreenTimeRequest) {
  if (a.child_id !== b.child_id) return false;
  if (a.requested_minutes !== b.requested_minutes) return false;
  if ((a.request_message || '') !== (b.request_message || '')) return false;

  const createdDiff = Math.abs(
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return createdDiff <= 5000;
}

// When the same request was sent to multiple parents, the merged status is:
//  - 'approved' if ANY parent approved (one yes is enough)
//  - 'denied'   if ALL parents denied
//  - 'pending'  otherwise
function mergeStatus(statuses: ScreenTimeRequest['status'][]): ScreenTimeRequest['status'] {
  if (statuses.some((s) => s === 'approved')) return 'approved';
  if (statuses.length > 0 && statuses.every((s) => s === 'denied')) return 'denied';
  return 'pending';
}

function normalizeRequests(requests: ScreenTimeRequest[], role: 'child' | 'parent') {
  if (role !== 'child') {
    return requests;
  }

  // Group requests by logical identity, then collapse using mergeStatus
  const groups: ScreenTimeRequest[][] = [];
  for (const request of requests) {
    const group = groups.find((g) => shouldMergeChildRequests(g[0], request));
    if (group) {
      group.push(request);
    } else {
      groups.push([request]);
    }
  }

  return groups.map((group) => {
    // Prefer the approved one (so we keep its parent_response/responded_at)
    const approved = group.find((r) => r.status === 'approved');
    const base = approved ?? group[0];
    const mergedStatus = mergeStatus(group.map((r) => r.status));
    const latestCreated = group.reduce(
      (max, r) => (new Date(r.created_at).getTime() > new Date(max).getTime() ? r.created_at : max),
      base.created_at,
    );

    return {
      ...base,
      status: mergedStatus,
      created_at: latestCreated,
      parent_count: group.length,
    };
  });
}

export function useScreenTimeRequests(role: 'child' | 'parent'): UseScreenTimeRequestsResult {
  const [requests, setRequests] = useState<ScreenTimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const previousRequestsRef = useRef<ScreenTimeRequest[]>([]);

  const loadRequests = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('screen-time-request', {
        body: { action: 'get_requests', role }
      });

      if (error) throw error;
      setRequests(normalizeRequests(data.requests || [], role));
    } catch (error) {
      console.error('Error loading screen time requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  const createRequest = async (
    parentId: string,
    requestedMinutes: number,
    earnedMinutes: number,
    message?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('screen-time-request', {
        body: {
          action: 'create_request',
          parentId,
          requestedMinutes,
          earnedMinutes,
          message
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadRequests();
        return {
          success: true,
          request: data.request,
          deep_links: data.deep_links,
          validation: data.validation
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to create request',
        validation: data.validation,
      };
    } catch (error) {
      console.error('Error creating screen time request:', error);
      return {
        success: false,
        error: await getFunctionErrorMessage(error, 'Die Anfrage konnte nicht gesendet werden.'),
      };
    }
  };

  const respondToRequest = async (
    requestId: string,
    status: 'approved' | 'denied',
    response?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('screen-time-request', {
        body: {
          action: 'respond_to_request',
          requestId,
          status,
          response
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadRequests();
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to respond to request' };
    } catch (error) {
      console.error('Error responding to screen time request:', error);
      return {
        success: false,
        error: await getFunctionErrorMessage(error, 'Die Anfrage konnte nicht bearbeitet werden.'),
      };
    }
  };

  const checkForApprovals = useCallback((newRequests: ScreenTimeRequest[]) => {
    if (role !== 'child' || previousRequestsRef.current.length === 0) {
      previousRequestsRef.current = newRequests;
      return;
    }

    for (const newReq of newRequests) {
      if (newReq.status === 'approved') {
        const oldReq = previousRequestsRef.current.find(r => r.id === newReq.id);
        if (oldReq && oldReq.status === 'pending') {
          triggerCelebrationConfetti();

          toast.success(`🎉 Bildschirmzeit genehmigt!`, {
            description: `Deine Eltern haben ${newReq.requested_minutes} Minuten Bildschirmzeit freigegeben!`,
            duration: 8000,
          });
        }
      } else if (newReq.status === 'denied') {
        const oldReq = previousRequestsRef.current.find(r => r.id === newReq.id);
        if (oldReq && oldReq.status === 'pending') {
          toast.error(`Bildschirmzeit abgelehnt`, {
            description: newReq.parent_response || 'Deine Anfrage wurde leider abgelehnt.',
            duration: 8000,
          });
        }
      }
    }

    previousRequestsRef.current = newRequests;
  }, [role]);

  useEffect(() => {
    loadRequests();

    if (role === 'child') {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;

        const channel = supabase
          .channel('screen-time-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'screen_time_requests',
              filter: `child_id=eq.${user.id}`
            },
            async () => {
              const { data } = await supabase.functions.invoke('screen-time-request', {
                body: { action: 'get_requests', role: 'child' }
              });

              if (data?.requests) {
                const normalizedRequests = normalizeRequests(data.requests, 'child');
                checkForApprovals(normalizedRequests);
                setRequests(normalizedRequests);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      });
    }
  }, [role, loadRequests, checkForApprovals]);

  return {
    requests,
    loading,
    createRequest,
    respondToRequest,
    refreshRequests: loadRequests
  };
}
