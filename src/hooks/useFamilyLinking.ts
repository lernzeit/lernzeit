import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface InvitationCode {
  id: string;
  code: string;
  child_id: string | null;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

interface ChildProfile {
  id: string;
  name: string;
  grade: number;
  username?: string | null;
}

export function useFamilyLinking() {
  const [loading, setLoading] = useState(false);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<ChildProfile[]>([]);
  const { toast } = useToast();

  // Load invitation codes and linked children
  const loadFamilyData = useCallback(async (userId: string) => {
    console.log('📊 loadFamilyData called for userId:', userId);
    try {
      setLoading(true);
      
      // Load invitation codes
      const { data: codes, error: codesError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setInvitationCodes(codes || []);

      // Load linked children by getting relationships and then fetching profiles
      const { data: relationships, error: relationshipsError } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', userId);

      console.log('👥 Relationships query result:', { relationships, relationshipsError });

      if (relationshipsError) throw relationshipsError;

      if (relationships && relationships.length > 0) {
        const childIds = relationships.map(rel => rel.child_id);
        console.log('🔍 Child IDs to fetch:', childIds);
        
        const { data: children, error: childrenError } = await supabase
          .from('profiles')
          .select('id, name, grade, username')
          .in('id', childIds);

        console.log('👶 Children query result:', { children, childrenError });

        if (childrenError) throw childrenError;
        console.log('👶 Loaded children:', children);
        setLinkedChildren(children || []);
      } else {
        setLinkedChildren([]);
      }

    } catch (error: any) {
      console.error('Error loading family data:', error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Generate new invitation code
  const generateInvitationCode = async (parentId: string, consentGivenAt?: string): Promise<string | null> => {
    setLoading(true);
    try {
      // Call database function to generate unique code
      const { data, error } = await supabase.rpc('generate_invitation_code');
      
      if (error) throw error;
      
      const newCode = data;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes expiry

      // Insert the code into the database with consent timestamp
      const insertData: any = {
        code: newCode,
        parent_id: parentId,
        expires_at: expiresAt.toISOString(),
      };
      if (consentGivenAt) {
        insertData.consent_given_at = consentGivenAt;
      }

      const { error: insertError } = await supabase
        .from('invitation_codes')
        .insert(insertData);

      if (insertError) throw insertError;

      toast({
        title: "Einladungscode erstellt!",
        description: `Code: ${newCode} (30 Min gültig)`,
      });

      await loadFamilyData(parentId);
      return newCode;

    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Code konnte nicht erstellt werden.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Use invitation code (for children) - COMPREHENSIVE DEBUG VERSION
  const useInvitationCode = async (code: string, childId: string): Promise<boolean> => {
    setLoading(true);
    console.log('🚀🚀🚀 FULL DEBUG: Starting invitation code claim');
    console.log('📊 Input parameters:', { code, childId });
    
    try {
      // STEP 0: Verify current authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Auth check:', { 
        user: user?.id, 
        authError,
        matches_childId: user?.id === childId 
      });
      
      if (authError || !user) {
        console.log('❌ Authentication failed');
        throw new Error('Benutzer ist nicht authentifiziert');
      }

      // Use SECURITY DEFINER function to bypass RLS completely
      console.log('🔍 Using database function to claim code...');
      
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'claim_invitation_code',
        {
          code_to_claim: code,
          claiming_child_id: childId
        }
      );

      console.log('🎯 Function result:', { functionResult, functionError });

      if (functionError) {
        console.log('❌ Function call failed:', functionError);
        toast({
          title: "Fehler",
          description: `Database-Fehler: ${functionError.message}`,
          variant: "destructive",
        });
        return false;
      }

      const result = functionResult as any;
      if (!result?.success) {
        console.log('❌ Function returned error:', result?.error);
        toast({
          title: "Ungültiger Code",
          description: result?.error || 'Unbekannter Fehler',
          variant: "destructive",
        });
        return false;
      }

      console.log('🎉🎉🎉 SUCCESS! Code claimed via database function!');
      toast({
        title: "Erfolgreich verknüpft!",
        description: "Du bist jetzt mit einem Elternteil verbunden.",
      });

      // Reload family data to update UI
      await loadFamilyData(result.parent_id);

      return true;

    } catch (error: any) {
      console.error('💥💥💥 COMPLETE FAILURE! Full error details:');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);
      
      toast({
        title: "Fehler",
        description: `Verknüpfung fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
      console.log('🏁 useInvitationCode completed');
    }
  };

  // Remove child link
  const removeChildLink = async (parentId: string, childId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('parent_child_relationships')
        .delete()
        .eq('parent_id', parentId)
        .eq('child_id', childId);

      if (error) throw error;

      toast({
        title: "Verknüpfung entfernt",
        description: "Die Verbindung wurde getrennt.",
      });

      await loadFamilyData(parentId);
      return true;

    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Verknüpfung konnte nicht entfernt werden.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Clean up expired codes
  const cleanupExpiredCodes = async () => {
    try {
      await supabase.rpc('cleanup_expired_codes');
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  };

  useEffect(() => {
    // Cleanup expired codes on mount
    cleanupExpiredCodes();
  }, []);

  return {
    loading,
    invitationCodes,
    linkedChildren,
    loadFamilyData,
    generateInvitationCode,
    useInvitationCode,
    removeChildLink,
  };
}