import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log('[AuthContext] Initializing auth session...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
      }
      console.log('[AuthContext] Initial session:', session ? 'Found' : 'None');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session ? 'Session exists' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0]?.includes('auth');

    console.log('[AuthContext] Route protection check:', {
      inAuthGroup,
      hasSession: !!session,
      segments
    });

    if (!session && !inAuthGroup) {
      console.log('[AuthContext] Redirecting to login - no session');
      router.replace('/(auth)/login' as any);
    } else if (session && inAuthGroup) {
      console.log('[AuthContext] Redirecting to app - has session');
      router.replace('/' as any);
    }
  }, [session, segments, isLoading, router]);

  const signUp = async (email: string, password: string) => {
    console.log('[AuthContext] Signing up user:', email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        Alert.alert('Sign Up Error', error.message);
        return { error };
      }

      console.log('[AuthContext] Sign up successful:', data);
      
      if (data?.user && !data.session) {
        Alert.alert(
          'Confirm Your Email',
          'Please check your email for a confirmation link to activate your account.'
        );
      }

      return { data };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Signing in user:', email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        Alert.alert('Sign In Error', error.message);
        return { error };
      }

      console.log('[AuthContext] Sign in successful');
      return { data };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out user');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
        Alert.alert('Sign Out Error', error.message);
        return { error };
      }

      console.log('[AuthContext] Sign out successful');
      return {};
    } finally {
      setIsLoading(false);
    }
  };

  return {
    session,
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
  };
});
