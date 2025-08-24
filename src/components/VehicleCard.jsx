
import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl, getVehicleImageUrl, ROUTES } from "@/utils";
import { Car, MapPin, Calendar, Gauge, Phone, Eye, Star, Crown, Zap, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';

// מטמון תמונות ברירת מחדל
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80';
const APP_OWNER_EMAIL = "zometauto@gmail.com";

const VehicleCard = memo(({ vehicle }) => {
  const [imageError, setImageError] = useState(false);
  const { user: currentUser } = useAuth();

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

  const isPremium = vehicle.listing_type === 'פרימיום';
  const isFeatured = vehicle.listing_type === 'מודגש';

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = vehicle.images && vehicle.images.length > 0 && !imageError 
    ? vehicle.images[0] 
    : DEFAULT_IMAGE;

  // בדיקת הרשאה לעריכה
  const canEdit = currentUser && (
    currentUser.email === vehicle.created_by || 
    currentUser.email === APP_OWNER_EMAIL
  );

  // בדיקות נתונים בסיסיות
  if (!vehicle || !vehicle.id) {
    return null;
  }

  return (
    <Card className={`group hover-lift glass-effect overflow-hidden shadow-lg border-0 transition-all duration-300 ${
      isPremium ? 'premium-glow' : ''
    }`} style={{ pointerEvents: 'auto' }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={vehicle.title || 'רכב'}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        
        {/* Premium/Featured Badges */}
        <div className="absolute top-4 right-4 flex gap-2 flex-wrap">
          {isPremium && (
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg flex items-center gap-1 backdrop-blur-sm">
              <Crown className="w-3 h-3" />
              פרימיום
            </Badge>
          )}
          {isFeatured && !isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex items-center gap-1 backdrop-blur-sm">
              <Star className="w-3 h-3" />
              מודגש
            </Badge>
          )}
          <Badge 
            className={`${
              vehicle.status === 'למכירה' 
                ? 'bg-green-500 hover:bg-green-600' 
                : vehicle.status === 'נמכר'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-yellow-500 hover:bg-yellow-600'
            } text-white shadow-lg backdrop-blur-sm`}
          >
            {vehicle.status || 'לא זמין'}
          </Badge>
        </div>

        {/* Views Counter */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 backdrop-blur-sm">
            <Eye className="w-3 h-3" />
            {vehicle.views_count || 0} צפיות
          </div>
        </div>

        {/* Price Overlay */}
        <div className="absolute bottom-4 right-4">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-xl font-bold">{formatPrice(vehicle.price)}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Title and Type */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-800 transition-colors duration-300">
              {vehicle.title || 'כותרת לא זמינה'}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-blue-800 border-blue-200">
                {vehicle.type || 'לא צוין'}
              </Badge>
              <span className="text-gray-600 text-sm">
                {vehicle.manufacturer || ''} {vehicle.model || ''}
              </span>
            </div>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{vehicle.year || 'לא צוין'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Gauge className="w-4 h-4 flex-shrink-0" />
              <span>{formatKilometers(vehicle.kilometers)} ק״מ</span>
            </div>
            {vehicle.location && (
              <div className="flex items-center gap-2 text-gray-600 col-span-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{vehicle.location}</span>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm truncate font-medium text-gray-800">{vehicle.contact_name || 'לא זמין'}</span>
              {/* FINAL FIX: Phone button using asChild for reliable dialing */}
              {vehicle.contact_phone && (
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r from-blue-50 to-amber-50 transition-all duration-200 flex items-center gap-1.5 flex-shrink-0"
                >
                  <a href={`tel:${vehicle.contact_phone}`} aria-label="התקשר למפרסם">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">התקשר</span>
                  </a>
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 items-center flex-shrink-0">
              <Link 
                to={`${ROUTES.VEHICLE_DETAILS}?id=${vehicle.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 transform hover:scale-105 ${
                  isPremium 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
                    : 'bg-blue-800 hover:bg-blue-900 text-white shadow-md hover:shadow-lg'
                }`}
                onClick={(e) => {
                  console.log('Vehicle card clicked:', vehicle.id);
                  // Don't prevent default - let React Router handle it
                }}
              >
                <Eye className="w-4 h-4" />
                צפה בפרטים
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

VehicleCard.displayName = 'VehicleCard';

export default VehicleCard;
