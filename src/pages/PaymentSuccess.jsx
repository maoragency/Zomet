
import React, { useState, useEffect } from 'react';
import { Vehicle, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Star, Crown, Eye, Share2, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl, ROUTES } from '@/utils';
import { useNavigation } from '@/hooks/useNavigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentSuccess() {
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toHome, toVehicleDetails, navigateTo } = useNavigation();

  useEffect(() => {
    const loadVehicle = async () => {
      const params = new URLSearchParams(location.search);
      const vehicleId = params.get('vehicleId');

      if (!vehicleId) {
        toHome();
        return;
      }

      try {
        const vehicleResponse = await Vehicle.filter({ id: vehicleId });

        if (vehicleResponse && vehicleResponse.length > 0) {
          setVehicle(vehicleResponse[0]);
        } else {
          console.error("Vehicle not found after payment success.");
          alert('הרכב לא נמצא. אנא צור קשר עם התמיכה.');
          toHome();
        }
      } catch (error) {
        console.error("Error loading vehicle on success page:", error);
        alert('שגיאה בטעינת פרטי הרכב. אנא צור קשר עם התמיכה.');
        toHome();
      }

      setIsLoading(false);
    };

    loadVehicle();
  }, [location.search, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const getPlanIcon = (listingType) => {
    return listingType === 'פרימיום' ? Crown : Star;
  };

  const getPlanColor = (listingType) => {
    return listingType === 'פרימיום' 
      ? 'from-purple-600 to-pink-600' 
      : 'from-amber-500 to-orange-500';
  };

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">התשלום בוצע בהצלחה! 🎉</h1>
          <p className="text-xl text-gray-600">המודעה שלך שודרגה ופעילה כעת</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Vehicle Card */}
          {vehicle && (
            <Card className="glass-effect shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">המודעה שודרגה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Vehicle Image */}
                {vehicle.images && vehicle.images.length > 0 && (
                  <div className="relative">
                    <img 
                      src={vehicle.images[0]} 
                      alt={vehicle.title}
                      className="w-full aspect-video object-cover rounded-xl"
                    />
                    {/* Premium Badge */}
                    <div className={`absolute top-4 right-4 bg-gradient-to-r ${getPlanColor(vehicle.listing_type)} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1`}>
                      {React.createElement(getPlanIcon(vehicle.listing_type), { className: "w-4 h-4" })}
                      {vehicle.listing_type}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold mb-2">{vehicle.title}</h3>
                  <p className="text-gray-600 mb-2">{vehicle.manufacturer} {vehicle.model}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(vehicle.price)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link to={`${ROUTES.VEHICLE_DETAILS}?id=${vehicle.id}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Eye className="w-4 h-4 ml-2" />
                      צפה במודעה
                    </Button>
                  </Link>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 ml-2" />
                    שתף
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="glass-effect shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">מה הלאה?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">חשבונית נשלחה</h4>
                    <p className="text-green-700 text-sm">קיבלת חשבונית רשמית למייל שלך</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-50 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800">המודעה פעילה</h4>
                    <p className="text-blue-700 text-sm">המודעה שלך מופיעה עם הדגשה מיוחדת</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-800">יותר צפיות</h4>
                    <p className="text-amber-700 text-sm">תקבל יותר פניות מקונים מעוניינים</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-3">פעולות מומלצות:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    ודא שכל הפרטים במודעה מדויקים
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    שתף את המודעה ברשתות החברתיות
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    היה זמין לפניות של קונים
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link to={ROUTES.MY_LISTINGS}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    לכל המודעות שלי
                  </Button>
                </Link>
                <Link to={ROUTES.ADD_VEHICLE}>
                  <Button variant="outline" className="w-full">
                    פרסם עוד מודעה
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Note */}
        <div className="mt-12 text-center bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-2">זקוק לעזרה?</h3>
          <p className="text-gray-600 mb-4">אנחנו כאן כדי לעזור לך להשיג את המכירה הטובה ביותר</p>
          <p className="text-blue-600 font-medium">צוות התמיכה של צומת</p>
        </div>
      </div>
    </div>
  );
}
