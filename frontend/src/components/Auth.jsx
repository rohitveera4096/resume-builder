import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Auth({ onAuthSuccess, defaultIsLogin = true }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationType, setVerificationType] = useState('signup'); // 'signup' or 'recovery'
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setIsLogin(defaultIsLogin);
    setIsForgotPassword(false);
    setIsVerifying(false);
  }, [defaultIsLogin]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isVerifying) {
        if (verificationType === 'signup') {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup'
          });
          if (error) throw error;
          if (data.session && onAuthSuccess) {
            onAuthSuccess(data.session);
          }
        } else if (verificationType === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'recovery'
          });
          if (error) throw error;
          // After recovery verification, update the password
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (updateError) throw updateError;
          alert('Password successfully updated! You are now logged in.');
          if (data.session && onAuthSuccess) {
            onAuthSuccess(data.session);
          }
        }
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setVerificationType('recovery');
        setIsVerifying(true);
      } else {
        let sessionData = null;
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          sessionData = data.session;
          if (onAuthSuccess && sessionData) {
            onAuthSuccess(sessionData);
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName }
            }
          });
          if (error) throw error;
          if (!data.session) {
            setVerificationType('signup');
            setIsVerifying(true);
          } else {
            if (onAuthSuccess) onAuthSuccess(data.session);
          }
        }
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  let title = '';
  let description = '';

  if (isVerifying) {
    title = 'Verify Email';
    description = 'Enter the 8-digit OTP code sent to your email.';
  } else if (isForgotPassword) {
    title = 'Reset Password';
    description = 'Enter your email address to receive a password reset code.';
  } else if (isLogin) {
    title = 'Welcome Back';
    description = 'Sign in to access your ATS Resume Builder';
  } else {
    title = 'Create Account';
    description = 'Register to start building professional resumes';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            
            {!isVerifying && !isLogin && !isForgotPassword && (
              <div className="space-y-2 text-left">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            
            {!isVerifying && (
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {!isVerifying && !isForgotPassword && (
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs font-medium text-primary hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {isVerifying && (
              <div className="space-y-2 text-left">
                <Label htmlFor="otp">8-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="12345678"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            )}

            {isVerifying && verificationType === 'recovery' && (
              <div className="space-y-2 text-left mt-4">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? 'Please wait...' 
                : (isVerifying 
                    ? (verificationType === 'recovery' ? 'Reset Password' : 'Verify Account')
                    : (isForgotPassword 
                        ? 'Send Reset Code' 
                        : (isLogin ? 'Sign In' : 'Sign Up')))}
            </Button>
          </form>
        </CardContent>
        
        {!isVerifying && (
          <CardFooter className="flex flex-col items-center justify-center space-y-2">
            {isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-primary font-medium hover:underline focus:outline-none"
              >
                Back to Sign In
              </button>
            ) : (
              <div className="text-sm text-muted-foreground text-center">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => {
                    const nextState = !isLogin;
                    setIsLogin(nextState);
                    navigate(nextState ? '/login' : '/signup');
                  }}
                  className="text-primary font-medium hover:underline focus:outline-none"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
