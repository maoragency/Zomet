
import React, { useState, useEffect } from "react";
import { Vehicle, User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, CheckCircle, ImageIcon, Zap, Star, Crown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/hooks/useAuth";

export default function AddVehicle() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("בסיסי");
  const [includeVat, setIncludeVat] = useState(true); // New state for VAT

  const [formData, setFormData] = useState({
    title: "", type: "", manufacturer: "", model: "", year: "", kilometers: "", price: "",
    description: "", contact_name: "", contact_phone: "", contact_email: "", location: "",
    engine_type: "", transmission: "", seats: "", hand: "", images: [], listing_type: "בסיסי",
  });

  // Helper function to clean and parse numbers with commas
  const parseNumberWithCommas = (value) => {
    if (!value) return null;
    // Remove all non-digit characters except commas, then remove commas
    const cleaned = value.toString().replace(/[^\d,]/g, '').replace(/,/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  // Helper function to format numbers with commas for display
  const formatNumberWithCommas = (value) => {
    if (value === null || value === undefined || value === "") return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  useEffect(() => {
    const initPage = async () => {
      // Wait for auth to load
      if (authLoading) return;
      
      setIsLoading(true);
      const urlParams = new URLSearchParams(location.search);
      const editId = urlParams.get('edit');

      // Check if user is authenticated
      if (!user) {
        console.error("User not logged in or session expired");
        alert("עליך להיות מחובר כדי לפרסם או לערוך מודעה.");
        navigate(createPageUrl("Home"));
        return;
      }

      if (editId) {
        // --- EDIT MODE ---
        setIsEditMode(true);
        setEditVehicleId(editId);

        try {
          const vehicleResponse = await Vehicle.filter({ id: editId });

          if (!vehicleResponse || vehicleResponse.length === 0) {
            alert("המודעה לעריכה לא נמצאה.");
            navigate(createPageUrl("Home"));
            return;
          }

          const vehicleToEdit = vehicleResponse[0];
          const canEdit = vehicleToEdit.created_by === user.id || user.email === "zometauto@gmail.com";

          if (!canEdit) {
            alert("אין לך הרשאה לערוך מודעה זו.");
            navigate(createPageUrl("Home"));
            return;
          }
          
          setFormData({
            title: vehicleToEdit.title || "",
            type: vehicleToEdit.type || "",
            manufacturer: vehicleToEdit.manufacturer || "",
            model: vehicleToEdit.model || "",
            year: vehicleToEdit.year ? String(vehicleToEdit.year) : "",
            kilometers: vehicleToEdit.kilometers ? formatNumberWithCommas(vehicleToEdit.kilometers) : "",
            price: vehicleToEdit.price ? formatNumberWithCommas(vehicleToEdit.price) : "",
            description: vehicleToEdit.description || "",
            contact_name: vehicleToEdit.contact_name || "",
            contact_phone: vehicleToEdit.contact_phone || "",
            contact_email: vehicleToEdit.contact_email || "",
            location: vehicleToEdit.location || "",
            engine_type: vehicleToEdit.engine_type || "",
            transmission: vehicleToEdit.transmission || "",
            seats: vehicleToEdit.seats ? String(vehicleToEdit.seats) : "",
            hand: vehicleToEdit.hand ? String(vehicleToEdit.hand) : "",
            images: vehicleToEdit.images || [],
            listing_type: vehicleToEdit.listing_type || "בסיסי",
          });
          setSelectedPlan(vehicleToEdit.listing_type || "בסיסי");
          setIncludeVat(vehicleToEdit.vat_included !== undefined ? vehicleToEdit.vat_included : true); // Set VAT status from existing vehicle

        } catch (vehicleError) {
          console.error("Error loading vehicle for edit:", vehicleError);
          alert("שגיאה בטעינת פרטי הרכב לעריכה.");
          navigate(createPageUrl("Home"));
          return;
        }
      } else {
        // --- NEW VEHICLE MODE ---
        setFormData(prev => ({
            ...prev,
            contact_name: user.full_name || "",
            contact_email: user.email || "",
        }));
      }
      setIsLoading(false);
    };

    initPage();
  }, [location.search, navigate, user, authLoading]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate files before upload
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = [];

    files.forEach(file => {
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name}: גודל הקובץ חורג מ-10MB`);
      }
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name}: סוג קובץ לא נתמך`);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`שגיאות בקבצים:\n${invalidFiles.join('\n')}`);
      return;
    }

    setUploadingImages(true);
    setUploadErrors([]);
    setUploadProgress({});

    try {
      const uploadPromises = files.map(async (file, index) => {
        const fileId = `file_${index}_${Date.now()}`;
        
        try {
          // Set initial progress
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { fileName: file.name, progress: 0, stage: 'starting' }
          }));

          const response = await UploadFile({ 
            file,
            options: {
              optimize: true,
              generateThumbnail: true,
              compressionOptions: {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.85
              }
            },
            onProgress: (progressData) => {
              setUploadProgress(prev => ({
                ...prev,
                [fileId]: {
                  fileName: file.name,
                  progress: progressData.progress || 0,
                  stage: progressData.stage || 'uploading'
                }
              }));
            }
          });

          // Mark as complete
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              fileName: file.name,
              progress: 100,
              stage: 'complete'
            }
          }));

          return response;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          
          // Mark as error
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              fileName: file.name,
              progress: 0,
              stage: 'error',
              error: error.message
            }
          }));

          setUploadErrors(prev => [...prev, `${file.name}: ${error.message}`]);
          return null;
        }
      });

      const responses = await Promise.all(uploadPromises);
      const successfulUploads = responses.filter(Boolean);
      const urls = successfulUploads.map(res => res?.file_url).filter(Boolean);
      
      if (urls.length > 0) {
        setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      }

      // Show summary
      if (uploadErrors.length > 0) {
        alert(`הועלו ${urls.length} תמונות בהצלחה.\nשגיאות: ${uploadErrors.length}\n\n${uploadErrors.join('\n')}`);
      } else if (urls.length > 0) {
        // Clear progress after successful upload
        setTimeout(() => {
          setUploadProgress({});
        }, 2000);
      }

    } catch (error) {
      console.error("Error in image upload process:", error);
      alert("שגיאה כללית בהעלאת תמונות. אנא נסה שוב.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadingImages) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (uploadingImages) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Create a synthetic event to reuse the existing upload logic
      const syntheticEvent = {
        target: {
          files: imageFiles
        }
      };
      handleImageUpload(syntheticEvent);
    } else {
      alert('אנא גרור רק קבצי תמונה');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const vehicleData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        kilometers: parseNumberWithCommas(formData.kilometers),
        price: parseNumberWithCommas(formData.price) || 0, // Changed: use 0 instead of null for price
        seats: formData.seats ? parseInt(formData.seats) : null,
        hand: formData.hand ? parseInt(formData.hand) : null,
        listing_type: selectedPlan,
        status: "למכירה",
        vat_included: includeVat
      };

      // Validate required fields before sending
      if (!vehicleData.price || vehicleData.price <= 0) {
        alert("נדרש להזין מחיר תקין");
        setIsSubmitting(false);
        return;
      }

      if (isEditMode) {
        await Vehicle.update(editVehicleId, vehicleData);
        navigate(createPageUrl(`VehicleDetails?id=${editVehicleId}`));
      } else {
        vehicleData.views_count = 0;
        const newVehicle = await Vehicle.create(vehicleData);
        navigate(createPageUrl(`VehicleDetails?id=${newVehicle.id}`));
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("שגיאה בשמירת המודעה. אנא ודא שכל השדות הנדרשים מלאים כהלכה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800"></div>
        <p className="ml-4 text-lg">טוען...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isEditMode ? `עריכת מודעה: ${formData.title}` : 'הוסף מודעה חדשה'}
              </CardTitle>
            </CardHeader>
          </Card>

          {!isEditMode && (
            <Card className="glass-effect shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">בחר רמת חשיפה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      value: "בסיסי", 
                      name: "מודעה בסיסית", 
                      price: "חינם", 
                      icon: Zap,
                      description: "מיקום נמוך ביחס למשודרגים • פחות חשיפה",
                      cardStyle: "bg-white border-gray-200",
                      selectedStyle: "border-blue-500 bg-gradient-to-r from-blue-50 to-amber-50",
                      iconColor: "text-gray-600"
                    },
                    { 
                      value: "מודגש", 
                      name: "מודעה מודגשת", 
                      price: "₪119.90", 
                      icon: Star,
                      description: "חשיפה גבוהה יותר מהרגילה בבסיסית • מיקום גבוה יותר בעמודי החיפוש",
                      cardStyle: "bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300",
                      selectedStyle: "border-gray-500 bg-gradient-to-br from-gray-200 to-gray-300 shadow-lg",
                      iconColor: "text-gray-700"
                    },
                    { 
                      value: "פרימיום", 
                      name: "מודעה פרימיום", 
                      price: "₪179.90", 
                      icon: Crown,
                      description: "הדרך למכור מהר ולקבל את המחיר המקסימלי! • מקסימום חשיפה ובראש התוצאות",
                      cardStyle: "bg-gradient-to-br from-yellow-100 to-amber-200 border-yellow-300",
                      selectedStyle: "border-yellow-500 bg-gradient-to-br from-yellow-200 to-amber-300 shadow-xl",
                      iconColor: "text-yellow-700"
                    }
                  ].map((plan) => {
                    const IconComponent = plan.icon;
                    const isSelected = selectedPlan === plan.value;
                    return (
                      <div 
                        key={plan.value} 
                        className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-md ${
                          isSelected ? plan.selectedStyle : plan.cardStyle
                        }`}
                        onClick={() => setSelectedPlan(plan.value)}
                      >
                        <div className="flex items-start gap-4 text-right" dir="rtl">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <IconComponent className={`w-8 h-8 ${plan.iconColor}`} />
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                              </div>
                              {isSelected && <CheckCircle className="w-6 h-6 text-green-500" />}
                            </div>
                            <p className="text-2xl font-bold text-blue-600 mb-3">{plan.price}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{plan.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">פרטים בסיסיים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כותרת המודעה *</label>
                  <Input 
                    placeholder="לדוגמה: מיניבוס מרצדס ספרינטר" 
                    value={formData.title} 
                    onChange={(e) => handleInputChange("title", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סוג רכב *</label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="בחר סוג רכב" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="משאית">משאית</SelectItem>
                      <SelectItem value="אוטובוס">אוטובוס</SelectItem>
                      <SelectItem value="מיניבוס">מיניבוס</SelectItem>
                      <SelectItem value="ציוד כבד">ציוד כבד</SelectItem>
                      <SelectItem value="מנוף">מנוף</SelectItem>
                      <SelectItem value="טרקטור">טרקטור</SelectItem>
                      <SelectItem value="מלגזה">מלגזה</SelectItem>
                      <SelectItem value="נגרר">נגרר</SelectItem>
                      <SelectItem value="רכב עבודה">רכב עבודה</SelectItem>
                      <SelectItem value="טנדר">טנדר</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">יצרן *</label>
                  <Input 
                    placeholder="מרצדס, פולקסווגן, פיאט" 
                    value={formData.manufacturer} 
                    onChange={(e) => handleInputChange("manufacturer", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">דגם *</label>
                  <Input 
                    placeholder="ספרינטר, קרפטר, דוקאטו" 
                    value={formData.model} 
                    onChange={(e) => handleInputChange("model", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שנת ייצור *</label>
                  <Input 
                    type="number" 
                    placeholder="2020" 
                    min="1990" 
                    max="2025" 
                    value={formData.year} 
                    onChange={(e) => handleInputChange("year", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">קילומטראז' *</label>
                  <Input 
                    // type="number"  -- Changed to text type to allow commas
                    placeholder="150,000 או 150000" 
                    value={formData.kilometers} 
                    onChange={(e) => handleInputChange("kilometers", e.target.value)} 
                    required 
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500 mt-1">ניתן לרשום עם פסיקים: 150,000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מחיר (₪) *</label>
                  <Input 
                    // type="number" -- Changed to text type to allow commas
                    placeholder="250,000 או 250000" 
                    value={formData.price} 
                    onChange={(e) => handleInputChange("price", e.target.value)} 
                    required 
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500 mt-1">ניתן לרשום עם פסיקים: 250,000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מע״מ</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={includeVat ? "default" : "outline"}
                      onClick={() => setIncludeVat(true)}
                      className="flex-1 h-12"
                    >
                      כולל מע״מ
                    </Button>
                    <Button
                      type="button"
                      variant={!includeVat ? "default" : "outline"}
                      onClick={() => setIncludeVat(false)}
                      className="flex-1 h-12"
                    >
                      ללא מע״מ
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מיקום</label>
                  <Input 
                    placeholder="תל אביב, חיפה, ירושלים" 
                    value={formData.location} 
                    onChange={(e) => handleInputChange("location", e.target.value)} 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">יד</label>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    min="0" 
                    value={formData.hand} 
                    onChange={(e) => handleInputChange("hand", e.target.value)} 
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מספר מקומות</label>
                  <Input 
                    type="number" 
                    placeholder="20" 
                    min="1" 
                    value={formData.seats} 
                    onChange={(e) => handleInputChange("seats", e.target.value)} 
                    className="h-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תיאור מפורט</label>
                <Textarea 
                  placeholder="תאר את מצב הרכב, ציוד נוסף, היסטוריית תחזוקה..." 
                  value={formData.description} 
                  onChange={(e) => handleInputChange("description", e.target.value)} 
                  rows={5} 
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">תמונות הרכב</CardTitle>
              <p className="text-sm text-gray-600">
                העלה עד 10 תמונות (מקסימום 10MB לתמונה). תמונות יעברו אופטימיזציה אוטומטית.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragOver 
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-amber-50' 
                    : uploadingImages 
                      ? 'border-gray-200 bg-gray-50' 
                      : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  id="image-upload" 
                  disabled={uploadingImages}
                />
                <label htmlFor="image-upload" className={`cursor-pointer block ${uploadingImages ? 'pointer-events-none' : ''}`}>
                  {uploadingImages ? (
                    <div className="space-y-4">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-blue-600 font-medium">מעלה תמונות...</p>
                      <p className="text-sm text-gray-500">אנא המתן, התמונות עוברות אופטימיזציה</p>
                    </div>
                  ) : isDragOver ? (
                    <div className="space-y-4">
                      <Upload className="w-16 h-16 text-blue-500 mx-auto animate-bounce" />
                      <div>
                        <h3 className="text-lg font-semibold text-blue-700 mb-2">שחרר כדי להעלות</h3>
                        <p className="text-blue-600">התמונות יועלו ויעברו אופטימיזציה אוטומטית</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="w-16 h-16 text-gray-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">הוסף תמונות</h3>
                        <p className="text-gray-500">לחץ כאן לבחירת תמונות או גרור קבצים לכאן</p>
                        <p className="text-xs text-gray-400 mt-2">
                          נתמכים: JPEG, PNG, WebP, GIF (עד 10MB)
                        </p>
                      </div>
                      <Button type="button" variant="outline" className="pointer-events-none">
                        <Upload className="w-4 h-4 ml-2" />
                        בחר תמונות
                      </Button>
                    </div>
                  )}
                </label>
              </div>

              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">התקדמות העלאה:</h4>
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {progress.fileName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {progress.stage === 'complete' ? 'הושלם' : 
                           progress.stage === 'error' ? 'שגיאה' :
                           progress.stage === 'optimizing' ? 'מייעל' :
                           progress.stage === 'thumbnail' ? 'יוצר תמונה ממוזערת' :
                           progress.stage === 'uploading' ? 'מעלה' : 'מתחיל'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            progress.stage === 'error' ? 'bg-red-500' :
                            progress.stage === 'complete' ? 'bg-green-500' :
                            'bg-gradient-to-r from-blue-50 to-amber-500'
                          }`}
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      {progress.error && (
                        <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">שגיאות בהעלאה:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Uploaded Images */}
              {formData.images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">תמונות שהועלו ({formData.images.length})</h4>
                    <p className="text-xs text-gray-500">התמונה הראשונה תוצג כתמונה ראשית</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image} 
                          alt={`תמונה ${index + 1}`} 
                          className="w-full aspect-square object-cover rounded-lg shadow-md transition-transform group-hover:scale-105" 
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = '/placeholder-image.jpg';
                            e.target.alt = 'שגיאה בטעינת תמונה';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          title="הסר תמונה"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          {index === 0 ? "ראשית" : index + 1}
                        </div>
                        {index === 0 && (
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-50 to-amber-500 text-white px-2 py-1 rounded text-xs font-medium">
                            תמונה ראשית
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                  <Input 
                    placeholder="שם פרטי ומשפחה" 
                    value={formData.contact_name} 
                    onChange={(e) => handleInputChange("contact_name", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טלפון *</label>
                  <Input 
                    placeholder="050-123-4567" 
                    value={formData.contact_phone} 
                    onChange={(e) => handleInputChange("contact_phone", e.target.value)} 
                    required 
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
                  <Input 
                    type="email" 
                    placeholder="example@email.com" 
                    value={formData.contact_email} 
                    onChange={(e) => handleInputChange("contact_email", e.target.value)} 
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-8">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-12 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-800 to-amber-500 text-white hover-lift shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                  {isEditMode ? 'שומר...' : 'מפרסם...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 ml-2" />
                  {isEditMode ? 'שמור שינויים' : 'פרסם מודעה'}
                </>
              )}
            </Button>
            
            {isEditMode && (
              <Button 
                type="button" 
                variant="link" 
                onClick={() => navigate(createPageUrl(`VehicleDetails?id=${editVehicleId}`))} 
                className="block mx-auto mt-4"
              >
                בטל וחזור למודעה
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
