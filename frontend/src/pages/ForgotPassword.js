import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Car, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      toast.success('Reset code sent! Check console for demo code.');
      setStep(2);
    } catch (error) {
      toast.error('Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email,
        reset_code: resetCode,
        new_password: newPassword
      });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-lg" data-testid="forgot-password-card">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Car className="h-8 w-8 text-primary-foreground" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-5" data-testid="request-code-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl"
                placeholder="you@example.com"
                data-testid="forgot-email-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-xl font-semibold text-lg shadow-md active:scale-95 transition-transform"
              data-testid="request-code-button"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5" data-testid="reset-password-form">
            <div className="space-y-2">
              <Label htmlFor="reset-code" className="text-sm font-medium uppercase tracking-wide">Reset Code</Label>
              <Input
                id="reset-code"
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
                className="h-12 rounded-xl font-mono"
                placeholder="123456"
                maxLength={6}
                data-testid="reset-code-input"
              />
              <p className="text-xs text-muted-foreground">Check your console/logs for the reset code</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium uppercase tracking-wide">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl"
                placeholder="••••••••"
                data-testid="new-password-input"
              />
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-xl font-semibold text-lg shadow-md active:scale-95 transition-transform"
              data-testid="reset-password-button"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="text-primary font-semibold hover:underline inline-flex items-center gap-2"
            data-testid="back-to-login-link"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};
