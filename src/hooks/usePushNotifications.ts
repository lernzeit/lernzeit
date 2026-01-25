import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { supabase } from '@/lib/supabase';
import { triggerCelebrationConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

interface UsePushNotificationsOptions {
  userId?: string;
  role?: 'child' | 'parent';
  enabled?: boolean;
}

/**
 * Hook to handle local notifications for screen time approvals
 * Uses Capacitor LocalNotifications which work even when app is in background
 */
export function usePushNotifications({ 
  userId, 
  role, 
  enabled = true 
}: UsePushNotificationsOptions) {
  const isNative = Capacitor.isNativePlatform();
  const hasPermissionRef = useRef(false);
  const lastNotificationIdRef = useRef(1);

  // Request notification permissions on mount
  const requestPermissions = useCallback(async () => {
    if (!isNative) {
      console.log('Local notifications only available on native platforms');
      return false;
    }

    try {
      const { display } = await LocalNotifications.checkPermissions();
      
      if (display === 'granted') {
        hasPermissionRef.current = true;
        return true;
      }

      if (display === 'prompt' || display === 'prompt-with-rationale') {
        const result = await LocalNotifications.requestPermissions();
        hasPermissionRef.current = result.display === 'granted';
        return hasPermissionRef.current;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, [isNative]);

  // Show a local notification
  const showNotification = useCallback(async (
    title: string, 
    body: string, 
    data?: Record<string, unknown>
  ) => {
    if (!isNative) {
      // Fallback for web - just show toast
      console.log('Notification (web fallback):', title, body);
      return;
    }

    if (!hasPermissionRef.current) {
      const granted = await requestPermissions();
      if (!granted) {
        console.log('Notification permissions not granted');
        return;
      }
    }

    try {
      const notificationId = lastNotificationIdRef.current++;
      
      const scheduleOptions: ScheduleOptions = {
        notifications: [
          {
            id: notificationId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) }, // Immediate
            sound: 'beep.wav',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#3b82f6',
            extra: data,
          }
        ]
      };

      await LocalNotifications.schedule(scheduleOptions);
      console.log('Notification scheduled:', title);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isNative, requestPermissions]);

  // Listen for notification taps
  useEffect(() => {
    if (!isNative) return;

    const setupListeners = async () => {
      // Handle notification tap when app is in background/killed
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notification tapped:', notification);
        
        const extra = notification.notification.extra;
        if (extra?.type === 'screen_time_approved') {
          // Trigger celebration when user taps the notification
          triggerCelebrationConfetti();
          toast.success(`🎉 Bildschirmzeit genehmigt!`, {
            description: `${extra.minutes} Minuten wurden freigegeben!`,
            duration: 8000,
          });
        }
      });

      // Handle notification received while app is in foreground
      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification received in foreground:', notification);
        // In-app toast is already handled by the realtime subscription
      });
    };

    setupListeners();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [isNative]);

  // Subscribe to screen time request updates for background notifications
  useEffect(() => {
    if (!enabled || !userId || role !== 'child') return;

    // Request permissions on mount for child users
    requestPermissions();

    // Subscribe to changes on screen_time_requests table
    const channel = supabase
      .channel(`push-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'screen_time_requests',
          filter: `child_id=eq.${userId}`
        },
        async (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Check if status changed to approved
          if (newRecord.status === 'approved' && oldRecord?.status === 'pending') {
            console.log('🔔 Screen time approved - triggering notification');
            
            // Show native notification (works in background)
            await showNotification(
              '🎉 Bildschirmzeit genehmigt!',
              `Deine Eltern haben ${newRecord.requested_minutes} Minuten Bildschirmzeit freigegeben!`,
              {
                type: 'screen_time_approved',
                requestId: newRecord.id,
                minutes: newRecord.requested_minutes,
              }
            );
          } else if (newRecord.status === 'denied' && oldRecord?.status === 'pending') {
            console.log('🔔 Screen time denied - triggering notification');
            
            await showNotification(
              'Bildschirmzeit abgelehnt',
              newRecord.parent_response || 'Deine Anfrage wurde leider abgelehnt.',
              {
                type: 'screen_time_denied',
                requestId: newRecord.id,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, userId, role, showNotification, requestPermissions]);

  return {
    requestPermissions,
    showNotification,
    isNative,
    hasPermission: hasPermissionRef.current,
  };
}
