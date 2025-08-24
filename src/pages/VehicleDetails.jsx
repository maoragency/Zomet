
import React, { useState, useEffect } from "react";
import { Vehicle, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Phone,
  MapPin,
  Calendar,
  Gauge,
  Car,
  Users,
  Fuel,
  ChevronLeft,
  ChevronRight,
  Share2,
  Heart,
  Edit
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl, safeNavigate, ROUTES } from "@/utils";
import { useNavigation } from "@/hooks/useNavigation";
import { useAuth } from "@/hooks/useAuth";

export default function VehicleDetails() {
  const navigate = useNavigate();
  const { navigateTo, toHome, toAddVehicle } = useNavigation();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // Get vehicle ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const vehicleId = urlParams.get('id');

      if (!vehicleId) {
        toHome();
        return;
      }

      try {
        // Load vehicle data
        const vehicleResponse = await Vehicle.filter({ id: vehicleId });

        if (vehicleResponse && vehicleResponse.length > 0) {
          setVehicle(vehicleResponse[0]);
          
          // Update view count (async, don't wait)
          Vehicle.update(vehicleId, {
            views_count: (vehicleResponse[0].views_count || 0) + 1
          }).catch(() => {}); // Silent fail
        } else {
          toHome();
        }
      } catch (error) {
        console.error("Error loading:", error);
        toHome();
      }

      setIsLoading(false);
    };

    loadData();
  }, [navigate]);

  // Helper functions
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return "מחיר לא זמין";
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatKilometers = (km) => {
    if (!km || isNaN(km)) return "לא זמין";
    return new Intl.NumberFormat('he-IL').format(km);
  };

  const nextImage = () => {
    if (vehicle?.images?.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === vehicle.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (vehicle?.images?.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? vehicle.images.length - 1 : prev - 1
      );
    }
  };

  // Check if user can edit - SIMPLE AND CLEAR
  const canUserEdit = () => {
    if (!user || !vehicle) return false;
    return user.id === vehicle.created_by || user.email === "zometauto@gmail.com";
  };

  // FIXED: Edit button handler - direct navigation
  const handleEditClick = () => {
    if (vehicle && vehicle.id) {
      navigateTo(`${ROUTES.ADD_VEHICLE}?edit=${vehicle.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">רכב לא נמצא</h3>
          <Button onClick={toHome}>
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={toHome}
          className="mb-8 hover-lift"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
              {vehicle.images && vehicle.images.length > 0 ? (
                <>
                  <img 
                    src={vehicle.images[currentImageIndex]} 
                    alt={vehicle.title} 
                    className="w-full h-full object-cover"
                  />
                  {vehicle.images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage} 
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={nextImage} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {vehicle.images.map((_, index) => (
                          <button 
                            key={index} 
                            onClick={() => setCurrentImageIndex(index)} 
                            className={`w-3 h-3 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Car className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>

            {vehicle.images && vehicle.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {vehicle.images.slice(0, 4).map((image, index) => (
                  <button 
                    key={index} 
                    onClick={() => setCurrentImageIndex(index)} 
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${index === currentImageIndex ? 'border-blue-500' : 'border-transparent'}`}
                  >
                    <img 
                      src={image} 
                      alt={`תמונה ${index + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Information */}
          <div className="space-y-8">
            {/* Header with Edit Button for Owner */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge
                  className={`${
                    vehicle.status === 'למכירה'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                >
                  {vehicle.status}
                </Badge>

                <div className="flex gap-2">
                  {canUserEdit() && (
                    <Button 
                      onClick={handleEditClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      עריכת מודעה
                    </Button>
                  )}

                  <Button variant="outline" size="icon">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-2">{vehicle.title}</h1>
              <p className="text-xl text-gray-600 mb-4">
                {vehicle.manufacturer} {vehicle.model} • {vehicle.type}
              </p>

              <div className="text-4xl font-bold gradient-text">
                {formatPrice(vehicle.price)}
              </div>
            </div>

            {/* Vehicle Specs */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">מפרט עיקרי</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">שנת ייצור</p>
                      <p className="font-semibold">{vehicle.year || 'לא צוין'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gauge className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">קילומטראז'</p>
                      <p className="font-semibold">{formatKilometers(vehicle.kilometers)} ק״מ</p>
                    </div>
                  </div>
                  {vehicle.engine_type && (
                    <div className="flex items-center gap-3">
                      <Fuel className="w-8 h-8 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">סוג מנוע</p>
                        <p className="font-semibold">{vehicle.engine_type}</p>
                      </div>
                    </div>
                  )}
                  {vehicle.seats && (
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-indigo-600" />
                      <div>
                        <p className="text-sm text-gray-500">מספר מקומות</p>
                        <p className="font-semibold">{vehicle.seats}</p>
                      </div>
                    </div>
                  )}
                  {vehicle.location && (
                    <div className="flex items-center gap-3 col-span-2">
                      <MapPin className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-500">מיקום</p>
                        <p className="font-semibold">{vehicle.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {vehicle.description && (
              <Card className="glass-effect border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">תיאור</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {vehicle.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card className="glass-effect border-0 shadow-lg bg-gradient-to-r from-blue-50 to-amber-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">פרטי קשר</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {(vehicle.contact_name || 'ל').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{vehicle.contact_name || 'לא זמין'}</p>
                      <p className="text-gray-600">איש קשר</p>
                    </div>
                    {/* FINAL FIX: Phone button using asChild for reliable dialing */}
                    {vehicle.contact_phone && (
                      <Button asChild variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 px-4 py-2 font-semibold">
                        <a href={`tel:${vehicle.contact_phone}`}>
                          <Phone className="w-4 h-4 ml-2" />
                          {vehicle.contact_phone}
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* FINAL FIX: Large call button using asChild */}
                  {vehicle.contact_phone && (
                    <Button asChild className="w-full bg-blue-800 text-white h-14 text-lg font-semibold hover-lift shadow-lg hover:bg-blue-700 transition-colors">
                      <a href={`tel:${vehicle.contact_phone}`}>
                        <Phone className="w-5 h-5 ml-2" />
                        התקשר עכשיו
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
