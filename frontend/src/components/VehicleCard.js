import { Car, Edit, Trash2, AlertCircle, Clock, CheckCircle, FileText, Wrench } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const getStatusConfig = (status) => {
  switch (status) {
    case 'expired':
      return {
        label: 'Expired',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-500',
        icon: AlertCircle,
        borderColor: 'border-l-red-500'
      };
    case 'expiring':
      return {
        label: 'Expiring Soon',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500',
        icon: Clock,
        borderColor: 'border-l-amber-500'
      };
    default:
      return {
        label: 'Valid',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-500',
        icon: CheckCircle,
        borderColor: 'border-l-green-500'
      };
  }
};

export const VehicleCard = ({ vehicle, onDelete }) => {
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(vehicle.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={`rounded-2xl border-l-4 ${statusConfig.borderColor} hover:shadow-lg transition-all duration-200 p-5`} data-testid={`vehicle-card-${vehicle.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
            <Car className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-semibold" data-testid="vehicle-nickname">{vehicle.nickname}</h3>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm px-2 py-0.5 bg-secondary rounded border font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }} data-testid="vehicle-reg-number">
                {vehicle.reg_number}
              </code>
            </div>
          </div>
        </div>
        <Badge className={`${statusConfig.color} rounded-full px-3 py-1 flex items-center gap-1`} data-testid="vehicle-status-badge">
          <StatusIcon className="h-3.5 w-3.5" />
          <span className="font-semibold text-xs">{statusConfig.label}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
        <div>
          <span className="block text-xs uppercase tracking-wide">Type</span>
          <span className="font-medium text-foreground" data-testid="vehicle-type">{vehicle.vehicle_type}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide">Brand</span>
          <span className="font-medium text-foreground" data-testid="vehicle-brand">{vehicle.brand}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide">Model</span>
          <span className="font-medium text-foreground" data-testid="vehicle-model">{vehicle.model}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide">Year</span>
          <span className="font-medium text-foreground" data-testid="vehicle-year">{vehicle.year}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
          variant="outline"
          className="flex-1 h-12 rounded-xl font-semibold"
          data-testid="edit-vehicle-button"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          onClick={() => onDelete(vehicle.id)}
          variant="destructive"
          className="flex-1 h-12 rounded-xl font-semibold"
          data-testid="delete-vehicle-button"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </Card>
  );
};