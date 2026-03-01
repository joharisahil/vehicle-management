import { Car, Edit, Trash2, AlertCircle, Clock, CheckCircle, FileText, Wrench, Power } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useState } from 'react';

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

const getExpiryInfo = (documents) => {
  if (!documents || documents.length === 0) return null;
  
  const today = new Date();
  const alerts = [];
  
  documents.forEach(doc => {
    if (!doc.expiry_date) return;
    
    const expiryDate = new Date(doc.expiry_date);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const docName = doc.doc_type.replace('_', ' ').toUpperCase();
    
    if (diffDays < 0) {
      alerts.push({
        type: 'expired',
        message: `${docName} expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`,
        color: 'text-red-600 dark:text-red-400'
      });
    } else if (diffDays <= 30) {
      alerts.push({
        type: 'expiring',
        message: `${docName} expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        color: 'text-amber-600 dark:text-amber-400'
      });
    }
  });
  
  return alerts;
};

const getServiceAlerts = (services) => {
  if (!services || services.length === 0) return [];
  
  const today = new Date();
  const alerts = [];
  
  services.forEach(service => {
    if (!service.next_service_due) return;
    
    const dueDate = new Date(service.next_service_due);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) {
      alerts.push({
        type: 'service',
        message: `${service.service_type} due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        color: 'text-blue-600 dark:text-blue-400'
      });
    }
  });
  
  return alerts;
};

export const VehicleCard = ({ vehicle, onDelete, onToggleActive }) => {
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(vehicle.status);
  const StatusIcon = statusConfig.icon;
  const expiryAlerts = getExpiryInfo(vehicle.documents);
  const serviceAlerts = getServiceAlerts(vehicle.services);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete(vehicle.id);
  };

  const unpaidChallans = vehicle.challans?.filter(c => c.status === 'unpaid').length || 0;

  return (
    <>
      <Card 
        className={`rounded-2xl border-l-4 ${statusConfig.borderColor} hover:shadow-lg transition-all duration-200 p-5 ${!vehicle.is_active ? 'opacity-60' : ''}`} 
        data-testid={`vehicle-card-${vehicle.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
              <Car className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-semibold" data-testid="vehicle-nickname">{vehicle.nickname}</h3>
                {!vehicle.is_active && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
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

        {expiryAlerts && expiryAlerts.length > 0 && (
          <div className="mb-3 space-y-1">
            {expiryAlerts.slice(0, 2).map((alert, index) => (
              <div key={index} className={`text-xs font-medium ${alert.color} flex items-center gap-1`}>
                <AlertCircle className="h-3 w-3" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {serviceAlerts && serviceAlerts.length > 0 && (
          <div className="mb-3 space-y-1">
            {serviceAlerts.slice(0, 1).map((alert, index) => (
              <div key={index} className={`text-xs font-medium ${alert.color} flex items-center gap-1`}>
                <Wrench className="h-3 w-3" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

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

        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>{vehicle.challans?.length || 0} Challans</span>
            {unpaidChallans > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">
                {unpaidChallans} unpaid
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            <span>{vehicle.services?.length || 0} Services</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          <Power className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1">Active</span>
          <Switch
            checked={vehicle.is_active !== false}
            onCheckedChange={(checked) => onToggleActive(vehicle.id, checked)}
            data-testid="vehicle-active-toggle"
          />
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
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="flex-1 h-12 rounded-xl font-semibold"
            data-testid="delete-vehicle-button"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vehicle
              <strong> {vehicle.nickname} ({vehicle.reg_number})</strong> and all its documents, challans, and service records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" data-testid="confirm-delete-button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
