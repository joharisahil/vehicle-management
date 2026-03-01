import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { VehicleCard } from '../components/VehicleCard';
import { StatsCard } from '../components/StatsCard';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Car, AlertCircle, Clock, CheckCircle, Plus, FileText, Wrench, Download, Upload, Filter } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    status: '',
    vehicleType: '',
    challanFilter: '',
    serviceFilter: '',
    activeFilter: 'active'
  });
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchStats = async () => {
    try {
      const statsRes = await axios.get(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load stats');
    }
  };

  const fetchVehicles = async (newPage = 1, currentFilters = filters) => {
    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams({
        page: newPage,
        limit: 10
      });
      
      if (currentFilters.status) params.append('status_filter', currentFilters.status);
      if (currentFilters.vehicleType) params.append('vehicle_type', currentFilters.vehicleType);
      if (currentFilters.challanFilter) params.append('challan_filter', currentFilters.challanFilter);
      if (currentFilters.serviceFilter) params.append('service_filter', currentFilters.serviceFilter);
      if (currentFilters.activeFilter) params.append('active_filter', currentFilters.activeFilter);

      const vehiclesRes = await axios.get(`${API_URL}/api/vehicles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (newPage === 1) {
        setVehicles(vehiclesRes.data);
      } else {
        setVehicles(prev => [...prev, ...vehiclesRes.data]);
      }
      
      setHasMore(vehiclesRes.data.length === 10);
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchStats(), fetchVehicles()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setPage(1);
    fetchVehicles(1, newFilters);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVehicles(nextPage);
  };

  const handleToggleActive = async (vehicleId, isActive) => {
    try {
      await axios.put(`${API_URL}/api/vehicles/${vehicleId}`, 
        { is_active: isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(isActive ? 'Vehicle activated' : 'Vehicle deactivated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update vehicle status');
    }
  };

  const handleDelete = async (vehicleId) => {
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

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vehicles_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Vehicles exported successfully');
    } catch (error) {
      toast.error('Failed to export vehicles');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vehicle_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/vehicles/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} rows had errors. Check console for details.`);
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import vehicles');
    } finally {
      setImporting(false);
      event.target.value = '';
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
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="hidden md:flex h-12 rounded-xl font-semibold"
              data-testid="download-template-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="hidden md:flex h-12 rounded-xl font-semibold"
              data-testid="export-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => document.getElementById('import-file-input').click()}
              variant="outline"
              className="hidden md:flex h-12 rounded-xl font-semibold"
              disabled={importing}
              data-testid="import-button"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import'}
            </Button>
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
            <Button
              onClick={() => navigate('/vehicles/add')}
              className="h-12 md:h-14 px-6 rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
              data-testid="add-vehicle-desktop-button"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-4">
              <StatsCard title="Total" value={stats.total_vehicles} icon={Car} color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
              <StatsCard title="Valid" value={stats.valid_documents} icon={CheckCircle} color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
              <StatsCard title="Expiring" value={stats.expiring_soon} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
              <StatsCard title="Expired" value={stats.expired_documents} icon={AlertCircle} color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-8">
              <StatsCard title="Total Challans" value={stats.total_challans} icon={FileText} color="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
              <StatsCard title="Unpaid Challans" value={stats.unpaid_challans} icon={AlertCircle} color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" />
              <StatsCard title="Upcoming Services" value={stats.upcoming_services} icon={Wrench} color="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" />
            </div>
          </>
        )}

        <div className="bg-card rounded-2xl p-4 mb-6 border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={filters.activeFilter} onValueChange={(value) => handleFilterChange('activeFilter', value)}>
              <SelectTrigger data-testid="active-filter">
                <SelectValue placeholder="Vehicle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Vehicles</SelectItem>
                <SelectItem value="inactive">Inactive Vehicles</SelectItem>
                <SelectItem value="all">All Vehicles</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Document Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.vehicleType} onValueChange={(value) => handleFilterChange('vehicleType', value)}>
              <SelectTrigger data-testid="vehicle-type-filter">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="Car">Car</SelectItem>
                <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Bus">Bus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.challanFilter} onValueChange={(value) => handleFilterChange('challanFilter', value)}>
              <SelectTrigger data-testid="challan-filter">
                <SelectValue placeholder="Challans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Challans</SelectItem>
                <SelectItem value="unpaid">Unpaid Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.serviceFilter} onValueChange={(value) => handleFilterChange('serviceFilter', value)}>
              <SelectTrigger data-testid="service-filter">
                <SelectValue placeholder="Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Services</SelectItem>
                <SelectItem value="upcoming">Upcoming Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {vehiclesLoading && vehicles.length === 0 ? (
          <div className="flex items-center justify-center py-16" data-testid="vehicles-loading">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="empty-state">
            <div className="h-32 w-32 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Car className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>No Vehicles Found</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {Object.values(filters).some(f => f && f !== 'active') ? 'No vehicles match your filters. Try adjusting them.' : 'Start by adding your first vehicle to track documents and stay on top of renewals.'}
            </p>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6" data-testid="vehicles-grid">
              {vehicles.map((vehicle) => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
            
            {vehiclesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : hasMore ? (
              <div className="flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="h-12 px-8 rounded-xl font-semibold"
                  data-testid="load-more-button"
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
};
