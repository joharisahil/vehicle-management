import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Upload, X, FileText, AlertCircle, DollarSign, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DOC_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'puc', label: 'PUC (Pollution Under Control)' },
  { value: 'rc', label: 'RC (Registration Certificate)' },
  { value: 'road_tax', label: 'Road Tax' },
  { value: 'custom', label: 'Custom Document' }
];

const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'SUV', 'Van', 'Bus'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'];
const SERVICE_TYPES = ['Oil Change', 'Tire Rotation', 'Brake Service', 'General Service', 'Transmission', 'Battery', 'Other'];

export const VehicleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nickname: '',
    reg_number: '',
    vehicle_type: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    fuel_type: '',
    odometer: 0
  });

  const [documents, setDocuments] = useState([]);
  const [challans, setChallans] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (id) {
      fetchVehicle();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({
        nickname: response.data.nickname,
        reg_number: response.data.reg_number,
        vehicle_type: response.data.vehicle_type,
        brand: response.data.brand,
        model: response.data.model,
        year: response.data.year,
        fuel_type: response.data.fuel_type,
        odometer: response.data.odometer
      });
      setDocuments(response.data.documents || []);
      setChallans(response.data.challans || []);
      setServices(response.data.services || []);
    } catch (error) {
      toast.error('Failed to load vehicle data');
      navigate('/');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file, docIndex) => {
    if (!file) return null;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploading(false);
      return response.data.path;
    } catch (error) {
      setUploading(false);
      toast.error('File upload failed');
      return null;
    }
  };

  const addDocument = () => {
    setDocuments([...documents, {
      doc_type: 'insurance',
      issue_date: '',
      expiry_date: '',
      image_path: null,
      original_filename: null,
      custom_name: ''
    }]);
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index, field, value) => {
    const newDocs = [...documents];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setDocuments(newDocs);
  };

  const handleDocumentFileChange = async (index, file) => {
    if (file) {
      const path = await handleFileUpload(file, index);
      if (path) {
        updateDocument(index, 'image_path', path);
        updateDocument(index, 'original_filename', file.name);
        toast.success('File uploaded successfully');
      }
    }
  };

  const addChallan = () => {
    setChallans([...challans, {
      challan_number: '',
      date: '',
      amount: 0,
      reason: '',
      status: 'unpaid',
      payment_date: null
    }]);
  };

  const removeChallan = (index) => {
    setChallans(challans.filter((_, i) => i !== index));
  };

  const updateChallan = (index, field, value) => {
    const newChallans = [...challans];
    newChallans[index] = { ...newChallans[index], [field]: value };
    setChallans(newChallans);
  };

  const addService = () => {
    setServices([...services, {
      service_type: 'Oil Change',
      date: '',
      odometer: formData.odometer,
      cost: 0,
      description: '',
      next_service_due: null
    }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    setServices(newServices);
  };

  const validateForm = () => {
    if (!formData.nickname || !formData.reg_number || !formData.vehicle_type || !formData.brand || !formData.model) {
      toast.error('Please fill all required fields');
      return false;
    }

    for (const doc of documents) {
      if (!doc.expiry_date) {
        toast.error('All documents must have an expiry date');
        return false;
      }
      if (doc.issue_date && doc.expiry_date) {
        if (new Date(doc.issue_date) >= new Date(doc.expiry_date)) {
          toast.error('Expiry date must be after issue date');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        documents: documents.map(doc => ({
          doc_type: doc.doc_type,
          issue_date: doc.issue_date || null,
          expiry_date: doc.expiry_date,
          image_path: doc.image_path,
          original_filename: doc.original_filename
        })),
        challans: challans.map(c => ({
          challan_number: c.challan_number,
          date: c.date,
          amount: parseFloat(c.amount),
          reason: c.reason,
          status: c.status,
          payment_date: c.payment_date || null
        })),
        services: services.map(s => ({
          service_type: s.service_type,
          date: s.date,
          odometer: parseInt(s.odometer),
          cost: parseFloat(s.cost),
          description: s.description || null,
          next_service_due: s.next_service_due || null
        }))
      };

      if (id) {
        await axios.put(`${API_URL}/api/vehicles/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Vehicle updated successfully');
      } else {
        await axios.post(`${API_URL}/api/vehicles`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Vehicle added successfully');
      }
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="form-title">
          {id ? 'Edit Vehicle' : 'Add Vehicle'}
        </h1>
        <p className="text-muted-foreground mb-8 text-base md:text-lg">
          {id ? 'Update vehicle information and documents' : 'Enter vehicle details and upload documents'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8" data-testid="vehicle-form">
          <Card className="p-6 rounded-2xl">
            <h2 className="text-xl md:text-2xl font-semibold mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Basic Information</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium uppercase tracking-wide">Nickname *</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  required
                  className="h-12 rounded-xl"
                  placeholder="My Car"
                  data-testid="vehicle-nickname-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_number" className="text-sm font-medium uppercase tracking-wide">Registration Number *</Label>
                <Input
                  id="reg_number"
                  value={formData.reg_number}
                  onChange={(e) => handleInputChange('reg_number', e.target.value.toUpperCase())}
                  required
                  className="h-12 rounded-xl font-mono"
                  placeholder="MH01AB1234"
                  data-testid="vehicle-reg-number-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_type" className="text-sm font-medium uppercase tracking-wide">Vehicle Type *</Label>
                <Select value={formData.vehicle_type} onValueChange={(value) => handleInputChange('vehicle_type', value)}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="vehicle-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium uppercase tracking-wide">Brand *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  required
                  className="h-12 rounded-xl"
                  placeholder="Honda"
                  data-testid="vehicle-brand-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-medium uppercase tracking-wide">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  required
                  className="h-12 rounded-xl"
                  placeholder="City"
                  data-testid="vehicle-model-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-medium uppercase tracking-wide">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="h-12 rounded-xl"
                  data-testid="vehicle-year-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel_type" className="text-sm font-medium uppercase tracking-wide">Fuel Type *</Label>
                <Select value={formData.fuel_type} onValueChange={(value) => handleInputChange('fuel_type', value)}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="vehicle-fuel-type-select">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometer" className="text-sm font-medium uppercase tracking-wide">Odometer (km) *</Label>
                <Input
                  id="odometer"
                  type="number"
                  value={formData.odometer}
                  onChange={(e) => handleInputChange('odometer', parseInt(e.target.value))}
                  required
                  min="0"
                  className="h-12 rounded-xl"
                  placeholder="50000"
                  data-testid="vehicle-odometer-input"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>Documents</h2>
              <Button
                type="button"
                onClick={addDocument}
                variant="outline"
                className="h-10 rounded-xl font-semibold"
                data-testid="add-document-button"
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents added yet. Click "Add Document" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc, index) => (
                  <Card key={index} className="p-5 border-l-4 border-l-blue-500" data-testid={`document-${index}`}>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold">Document {index + 1}</h3>
                      <Button
                        type="button"
                        onClick={() => removeDocument(index)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`remove-document-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium uppercase tracking-wide">Document Type *</Label>
                        <Select value={doc.doc_type} onValueChange={(value) => updateDocument(index, 'doc_type', value)}>
                          <SelectTrigger className="h-12 rounded-xl" data-testid={`doc-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOC_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium uppercase tracking-wide">Issue Date</Label>
                        <Input
                          type="date"
                          value={doc.issue_date || ''}
                          onChange={(e) => updateDocument(index, 'issue_date', e.target.value)}
                          className="h-12 rounded-xl"
                          data-testid={`doc-issue-date-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium uppercase tracking-wide">Expiry Date *</Label>
                        <Input
                          type="date"
                          value={doc.expiry_date}
                          onChange={(e) => updateDocument(index, 'expiry_date', e.target.value)}
                          required
                          className="h-12 rounded-xl"
                          data-testid={`doc-expiry-date-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium uppercase tracking-wide">Upload Image</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleDocumentFileChange(index, e.target.files[0])}
                            className="h-12 rounded-xl"
                            disabled={uploading}
                            data-testid={`doc-upload-${index}`}
                          />
                        </div>
                        {doc.original_filename && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            ✓ {doc.original_filename}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1 h-14 rounded-xl font-semibold text-lg"
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 h-14 rounded-xl font-semibold text-lg shadow-md active:scale-95 transition-transform"
              data-testid="submit-button"
            >
              {loading ? 'Saving...' : (id ? 'Update Vehicle' : 'Add Vehicle')}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
