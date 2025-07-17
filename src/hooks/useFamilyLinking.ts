import { useState, useEffect } from 'react';
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
}

export function useFamilyLinking() {
  const [loading, setLoading] = useState(false);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<ChildProfile[]>([]);
  const { toast } = useToast();

  // Load invitation codes and linked children
  const loadFamilyData = async (userId: string) => {
    try {
      // Load invitation codes
      const { data: codes, error: codesError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setInvitationCodes(codes || []);

      // Load linked children
      const { data: relationships, error: relationshipsError } = await supabase
        .from('parent_child_relationships')
        .select(`
          child_id,
          profiles!parent_child_relationships_child_id_fkey (
            id,
            name,
            grade
          )
        `)
        .eq('parent_id', userId);

      if (relationshipsError) throw relationshipsError;
      
      const children = relationships?.map(rel => rel.profiles).filter(Boolean) || [];
      setLinkedChildren(children as ChildProfile[]);

    } catch (error: any) {
      console.error('Error loading family data:', error);
    }
  };

  // Generate new invitation code
  const generateInvitationCode = async (parentId: string): Promise<string | null> => {
    setLoading(true);
    try {
      // Call database function to generate unique code
      const { data, error } = await supabase.rpc('generate_invitation_code');
      
      if (error) throw error;
      
      const newCode = data;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes expiry

      // Insert the code into the database
      const { error: insertError } = await supabase
        .from('invitation_codes')
        .insert({
          code: newCode,
          parent_id: parentId,
          expires_at: expiresAt.toISOString()
        });

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

      // STEP 1: Query the code first to see current state
      console.log('🔍 STEP 1: Checking current code state...');
      const { data: currentCodeState, error: queryError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .single();
      
      console.log('📋 Current code state:', { currentCodeState, queryError });
      
      if (queryError) {
        console.log('❌ Code query failed:', queryError);
        throw new Error('Code konnte nicht gefunden werden');
      }

      // STEP 2: Check all conditions manually
      console.log('🔍 STEP 2: Manual condition checks...');
      const now = new Date().toISOString();
      const conditions = {
        code_exists: !!currentCodeState,
        is_not_used: currentCodeState?.is_used === false,
        not_expired: currentCodeState?.expires_at > now,
        child_id_null: currentCodeState?.child_id === null,
        user_authenticated: !!user?.id
      };
      console.log('✅ Condition checks:', conditions);
      
      const allConditionsMet = Object.values(conditions).every(Boolean);
      console.log('🎯 All conditions met:', allConditionsMet);
      
      if (!allConditionsMet) {
        console.log('❌ Conditions not met, cannot proceed');
        toast({
          title: "Ungültiger Code",
          description: "Der Code ist nicht gültig, bereits verwendet oder abgelaufen.",
          variant: "destructive",
        });
        return false;
      }

      // STEP 3: Use SECURITY DEFINER function to bypass RLS completely
      console.log('🔍 STEP 3: Using database function to claim code...');
      
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