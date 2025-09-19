import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  createRequest: (parentId: string, requestedMinutes: number, earnedMinutes: number, message?: string) => Promise<{ success: boolean; request?: ScreenTimeRequest; deep_links?: any; error?: string }>;
  respondToRequest: (requestId: string, status: 'approved' | 'denied', response?: string) => Promise<{ success: boolean; error?: string }>;
  refreshRequests: () => Promise<void>;
}

export function useScreenTimeRequests(role: 'child' | 'parent'): UseScreenTimeRequestsResult {
  const [requests, setRequests] = useState<ScreenTimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
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
  };

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
        return { success: true, request: data.request, deep_links: data.deep_links };
      }

      return { success: false, error: 'Failed to create request' };
    } catch (error) {
      console.error('Error creating screen time request:', error);
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    loadRequests();
  }, [role]);

  return {
    requests,
    loading,
    createRequest,
    respondToRequest,
    refreshRequests: loadRequests
  };
}