import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Car } from 'lucide-react';
import { toast } from 'sonner';

export const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-lg" data-testid="signup-card">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Car className="h-8 w-8 text-primary-foreground" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Get Started</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium uppercase tracking-wide">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12 rounded-xl"
              placeholder="John Doe"
              data-testid="signup-name-input"
            />
          </div>

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
              data-testid="signup-email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium uppercase tracking-wide">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-xl"
              placeholder="••••••••"
              data-testid="signup-password-input"
            />
            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-xl font-semibold text-lg shadow-md active:scale-95 transition-transform"
            data-testid="signup-submit-button"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="login-link">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
};