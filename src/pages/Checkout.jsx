
import React, { useState, useEffect } from 'react';
import { Vehicle, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Smartphone, CheckCircle, Star, Crown, ArrowRight, Receipt, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Wait for auth to load
      if (authLoading) return;
      
      // Check authentication
      if (!user) {
        alert("עליך להיות מחובר כדי לבצע תשלום.");
        navigate(createPageUrl("Home"));
        return;
      }

      // Get vehicle ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const vehicleId = urlParams.get('vehicleId');

      if (!vehicleId) {
        navigate(createPageUrl('Home'));
        return;
      }

      // Load vehicle data
      try {
        const vehicleResponse = await Vehicle.filter({ id: vehicleId });
        
        if (!vehicleResponse || vehicleResponse.length === 0) {
          console.error("Vehicle not found for checkout.");
          alert('הרכב לא נמצא. אנא נסה שוב.');
          navigate(createPageUrl('Home'));
          return;
        }
        
        const foundVehicle = vehicleResponse[0];

        // Check if user owns this vehicle
        if (foundVehicle.created_by !== user.id) {
          navigate(createPageUrl('Home'));
          return;
        }

        setVehicle(foundVehicle);
      } catch (error) {
        console.error('Error loading vehicle:', error);
        alert('שגיאה בטעינת פרטי הרכב. אנא נסה שוב.');
        navigate(createPageUrl('Home'));
      }

      setIsLoading(false);
    };

    loadData();
  }, [navigate, user, authLoading]);

  const getPlanDetails = (listingType) => {
    const plans = {
      'מודגש': {
        name: 'מודעה מודגשת',
        price: 119.90,
        originalPrice: 149,
        features: [
          'חשיפה גבוהה יותר מהרגילה בבסיסית',
          'מיקום גבוה יותר בעמודי החיפוש',
          'עד 10 תמונות',
          'תמיכה מועדפת',
          'פרסום ל-30 יום'
        ],
        icon: Star,
        color: 'from-gray-400 to-gray-600'
      },
      'פרימיום': {
        name: 'מודעה פרימיום',
        price: 179.90,
        originalPrice: 249,
        features: [
          'מיקום עליון בכל העמודים',
          'עיצוב מיוחד עם מסגרת זהב',
          'עד 15 תמונות',
          'פרסום ברשתות חברתיות',
          'תמיכה VIP 24/7',
          'פרסום ל-45 יום'
        ],
        icon: Crown,
        color: 'from-purple-600 to-pink-600'
      }
    };
    return plans[listingType] || plans['מודגש'];
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      alert('אנא בחר אמצעי תשלום');
      return;
    }

    setIsProcessing(true);

    try {
      const planDetails = getPlanDetails(vehicle.listing_type);
      
      // כאן תתרחש ההתחברות לחשבונית ירוקה
      // זה המקום שבו נשלח את הנתונים לחשבונית ירוקה
      const paymentData = {
        // פרטי המוצר
        item_name: `${planDetails.name} - ${vehicle.title}`,
        item_description: `שדרוג מודעה לרכב: ${vehicle.manufacturer} ${vehicle.model}`,
        amount: planDetails.price,
        currency: 'ILS',
        
        // פרטי הלקוח
        customer_name: user.full_name,
        customer_email: user.email,
        
        // פרטי התשלום
        payment_method: selectedPaymentMethod,
        
        // פרטים נוספים
        vehicle_id: vehicle.id,
        listing_type: vehicle.listing_type,
        
        // URL חזרה
        success_url: `${window.location.origin}${createPageUrl('PaymentSuccess')}?vehicleId=${vehicle.id}`,
        cancel_url: `${window.location.origin}${createPageUrl('MyListings')}`
      };

      // כאן נשלח לחשבונית ירוקה
      // בינתיים נדמה את התהליך
      
      // **דמיית תשלום מוצלח - זמני עד שיהיה API אמיתי**
      setTimeout(async () => {
        try {
          // עדכון סטטוס הרכב למודעה פעילה
          await Vehicle.update(vehicle.id, {
            status: 'למכירה',
            listing_type: vehicle.listing_type
          });
          
          // מעבר לעמוד הצלחה
          navigate(createPageUrl('PaymentSuccess') + `?vehicleId=${vehicle.id}`);
        } catch (error) {
          console.error('Error updating vehicle:', error);
          alert('אירעה שגיאה. אנא צור קשר עם התמיכה.');
          setIsProcessing(false);
        }
      }, 2000); // 2 שניות דמיית עיבוד

      // כשתהיה אינטגרציה אמיתית עם חשבונית ירוקה:
      // window.location.href = hashbonitYerukaUrl;

    } catch (error) {
      console.error('Payment error:', error);
      alert('אירעה שגיאה בתהליך התשלום. אנא נסה שוב.');
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const planDetails = getPlanDetails(vehicle.listing_type);
  const IconComponent = planDetails.icon;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`w-20 h-20 bg-gradient-to-r ${planDetails.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
            <IconComponent className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">השלמת תשלום</h1>
          <p className="text-xl text-gray-600">שדרג את המודעה שלך ותקבל יותר צפיות</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <Card className="glass-effect shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">פרטי ההזמנה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Vehicle Info */}
              <div className="border-b pb-6">
                <h3 className="font-semibold text-lg mb-3">פרטי הרכב</h3>
                <div className="flex gap-4">
                  {vehicle.images && vehicle.images.length > 0 && (
                    <img 
                      src={vehicle.images[0]} 
                      alt={vehicle.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium">{vehicle.title}</p>
                    <p className="text-gray-600">{vehicle.manufacturer} {vehicle.model}</p>
                    <p className="text-blue-600 font-semibold">
                      {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(vehicle.price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{planDetails.name}</h3>
                  <Badge className={`bg-gradient-to-r ${planDetails.color} text-white`}>
                    מומלץ
                  </Badge>
                </div>
                
                <ul className="space-y-2 mb-4">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">מחיר רגיל:</span>
                  <span className="line-through text-gray-400">₪{planDetails.originalPrice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">הנחת השקה:</span>
                  <span className="text-green-600">-₪{planDetails.originalPrice - planDetails.price}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">סה"כ לתשלום:</span>
                    <span className="text-3xl font-bold text-green-600">₪{planDetails.price}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">כולל מע"מ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="glass-effect shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">אמצעי תשלום</CardTitle>
              <p className="text-gray-600">בחר את אמצעי התשלום המועדף עליך</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Payment Options */}
              <div className="space-y-4">
                
                {/* Credit Card */}
                <div 
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPaymentMethod === 'credit_card' 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-amber-50 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod('credit_card')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-50 to-amber-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">כרטיס אשראי</h3>
                      <p className="text-gray-600 text-sm">ויזה, מאסטרקארד, אמריקן אקספרס</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                      <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">MC</div>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'credit_card' && (
                    <div className="mt-3 flex items-center gap-2 text-blue-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">נבחר</span>
                    </div>
                  )}
                </div>

                {/* Bit */}
                <div 
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPaymentMethod === 'bit' 
                      ? 'border-green-500 bg-green-50 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod('bit')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">ביט</h3>
                      <p className="text-gray-600 text-sm">תשלום מהיר ובטוח מהטלפון</p>
                    </div>
                    <div className="text-green-600 font-bold text-lg">BIT</div>
                  </div>
                  {selectedPaymentMethod === 'bit' && (
                    <div className="mt-3 flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">נבחר</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-gray-50 p-4 rounded-lg flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">תשלום מאובטח</h4>
                  <p className="text-sm text-gray-600">
                    התשלום מתבצע באמצעות חשבונית ירוקה - פלטפורמה מאובטחת ומוכרת.
                    תקבל חשבונית רשמית למייל מיד לאחר התשלום.
                  </p>
                </div>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handlePayment}
                disabled={!selectedPaymentMethod || isProcessing}
                className={`w-full h-14 text-lg font-semibold rounded-xl transition-all duration-300 ${
                  selectedPaymentMethod 
                    ? `bg-gradient-to-r ${planDetails.color} text-white hover:scale-105 shadow-lg` 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                    מעבד תשלום...
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 ml-2" />
                    שלם ₪{planDetails.price} ושדרג עכשיו
                  </>
                )}
              </Button>

              <div className="text-center">
                <button 
                  onClick={() => navigate(createPageUrl('MyListings'))}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  חזור למודעות שלי
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
