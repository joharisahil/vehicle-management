import { Car, Plus, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Garage Pro</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-button" className="h-10 w-10">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-10">
          <div className="flex items-center justify-around py-2">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
                location.pathname === '/' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
              }`}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="h-6 w-6" strokeWidth={2} />
              <span className="text-xs font-medium">Dashboard</span>
            </Link>
            <Link
              to="/vehicles/add"
              className="flex flex-col items-center gap-1 px-6 py-2 bg-primary text-primary-foreground rounded-xl shadow-lg"
              data-testid="nav-add-vehicle"
            >
              <Plus className="h-6 w-6" strokeWidth={2} />
              <span className="text-xs font-medium">Add</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};