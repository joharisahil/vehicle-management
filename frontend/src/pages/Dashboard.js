import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { VehicleCard } from '../components/VehicleCard';
import { StatsCard } from '../components/StatsCard';
import { Button } from '../components/ui/button';
import { Car, AlertCircle, Clock, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, vehiclesRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/vehicles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStats(statsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await axios.delete(`${API_URL}/api/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Vehicle deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-spinner">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="dashboard-title">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-base md:text-lg">Manage your vehicles and documents</p>
          </div>
          <Button
            onClick={() => navigate('/vehicles/add')}
            className="hidden md:flex h-12 md:h-14 px-6 rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
            data-testid="add-vehicle-desktop-button"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <StatsCard title="Total" value={stats.total_vehicles} icon={Car} color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            <StatsCard title="Valid" value={stats.valid_documents} icon={CheckCircle} color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <StatsCard title="Expiring" value={stats.expiring_soon} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
            <StatsCard title="Expired" value={stats.expired_documents} icon={AlertCircle} color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="empty-state">
            <div className="h-32 w-32 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Car className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>No Vehicles Yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">Start by adding your first vehicle to track documents and stay on top of renewals.</p>
            <Button
              onClick={() => navigate('/vehicles/add')}
              className="h-14 px-8 rounded-xl font-semibold text-lg shadow-md active:scale-95 transition-transform"
              data-testid="add-first-vehicle-button"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Vehicle
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="vehicles-list-title">
              Your Vehicles
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="vehicles-grid">
              {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
