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
}

interface UseScreenTimeRequestsResult {
  requests: ScreenTimeRequest[];
  loading: boolean;
  createRequest: (parentId: string, requestedMinutes: number, earnedMinutes: number, message?: string) => Promise<{ success: boolean; request?: ScreenTimeRequest; deep_links?: any; validation?: any; error?: string }>;
  respondToRequest: (requestId: string, status: 'approved' | 'denied', response?: string) => Promise<{ success: boolean; error?: string }>;
  refreshRequests: () => Promise<void>;
}

export function useScreenTimeRequests(role: 'child' | 'parent'): UseScreenTimeRequestsResult {
  const [requests, setRequests] = useState<ScreenTimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const previousRequestsRef = useRef<ScreenTimeRequest[]>([]);

  const loadRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('screen-time-request', {
        body: { action: 'get_requests', role }
      });

      if (error) throw error;
      setRequests(data.requests || []);
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
        await loadRequests(); // Refresh the list
        return { 
          success: true, 
          request: data.request, 
          deep_links: data.deep_links,
          validation: data.validation 
        };
      }

      return { success: false, error: data.error || 'Failed to create request' };
    } catch (error) {
      console.error('Error creating screen time request:', error);
      return { success: false, error: (error as Error).message };
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
        await loadRequests(); // Refresh the list
        return { success: true };
      }

      return { success: false, error: 'Failed to respond to request' };
    } catch (error) {
      console.error('Error responding to screen time request:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  // Check for newly approved requests and show notification
  const checkForApprovals = useCallback((newRequests: ScreenTimeRequest[]) => {
    if (role !== 'child' || previousRequestsRef.current.length === 0) {
      previousRequestsRef.current = newRequests;
      return;
    }

    // Find requests that were pending but are now approved
    for (const newReq of newRequests) {
      if (newReq.status === 'approved') {
        const oldReq = previousRequestsRef.current.find(r => r.id === newReq.id);
        if (oldReq && oldReq.status === 'pending') {
          // This request was just approved! Trigger celebration!
          triggerCelebrationConfetti();
          
          toast.success(`🎉 Bildschirmzeit genehmigt!`, {
            description: `Deine Eltern haben ${newReq.requested_minutes} Minuten Bildschirmzeit freigegeben!`,
            duration: 8000,
          });
        }
      } else if (newReq.status === 'denied') {
        const oldReq = previousRequestsRef.current.find(r => r.id === newReq.id);
        if (oldReq && oldReq.status === 'pending') {
          // This request was just denied
          toast.error(`Bildschirmzeit abgelehnt`, {
            description: newReq.parent_response || 'Deine Anfrage wurde leider abgelehnt.',
            duration: 8000,
          });
        }
      }
    }

    previousRequestsRef.current = newRequests;
  }, [role]);

  // Subscribe to realtime updates for children
  useEffect(() => {
    loadRequests();

    if (role === 'child') {
      // Get current user ID for filtering
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;

        // Subscribe to changes on screen_time_requests table
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
            async (payload) => {
              console.log('🔔 Screen time request updated:', payload);
              
              // Reload requests and check for approvals
              const { data } = await supabase.functions.invoke('screen-time-request', {
                body: { action: 'get_requests', role: 'child' }
              });
              
              if (data?.requests) {
                checkForApprovals(data.requests);
                setRequests(data.requests);
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