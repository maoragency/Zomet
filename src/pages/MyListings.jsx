
import React, { useState, useEffect } from 'react';
import { Vehicle } from '@/api/entities';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl, ROUTES } from '@/utils';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { List, Plus, Edit, Trash2, Car, Eye, CreditCard } from 'lucide-react';

function MyListingItem({ vehicle, onDelete }) {
  const navigate = useNavigate();
  const { navigateTo } = useNavigation();
  const formatPrice = (price) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(price);

  const isPendingPayment = vehicle.status === 'ממתין לתשלום';

  const getStatusInfo = () => {
    switch(vehicle.status) {
      case 'למכירה':
        return { text: 'למכירה', color: 'text-green-600' };
      case 'ממתין לתשלום':
        return { text: 'ממתין לתשלום', color: 'text-amber-600' };
      case 'נמכר':
        return { text: 'נמכר', color: 'text-red-600' };
      default:
        return { text: vehicle.status, color: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className={`glass-effect shadow-lg border-0 overflow-hidden ${isPendingPayment ? 'border-2 border-amber-400' : ''}`}>
      {isPendingPayment && (
        <div className="bg-amber-100 text-amber-800 text-sm font-semibold p-2 text-center">
          נדרש תשלום להפעלת המודעה
        </div>
      )}
      <div className="grid grid-cols-3">
        <div className="col-span-1">
          <img
            src={vehicle.images && vehicle.images.length > 0 ? vehicle.images[0] : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500'}
            alt={vehicle.title}
            className={`w-full h-full object-cover ${isPendingPayment ? 'opacity-50' : ''}`}
          />
        </div>
        <div className="col-span-2 p-4 flex flex-col justify-between">
          <div>
            <p className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.text}</p>
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{vehicle.title}</h3>
            <p className="text-blue-800 font-semibold">{formatPrice(vehicle.price)}</p>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {isPendingPayment ? (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => navigateTo(`${ROUTES.CHECKOUT}?vehicleId=${vehicle.id}`)}>
                <CreditCard className="w-4 h-4 ml-1" /> המשך לתשלום
              </Button>
            ) : (
              <>
                <Link to={`${ROUTES.VEHICLE_DETAILS}?id=${vehicle.id}`}>
                  <Button size="sm" variant="ghost">
                    <Eye className="w-4 h-4 ml-1" /> צפייה
                  </Button>
                </Link>
                <Link to={`${ROUTES.ADD_VEHICLE}?edit=${vehicle.id}`}>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-600 hover:bg-gradient-to-r from-blue-50 to-amber-50">
                    <Edit className="w-4 h-4 ml-1" /> עריכה
                  </Button>
                </Link>
              </>
            )}
            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => onDelete(vehicle.id)}>
              <Trash2 className="w-4 h-4 ml-1" /> מחיקה
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function MyListings() {
  const navigate = useNavigate();
  const { toHome, toAddVehicle } = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      if (authLoading) return;
      
      if (!user) {
        toHome();
        return;
      }

      try {
        const userListings = await Vehicle.getByUser(user.email, '-created_date');
        setListings(userListings);
      } catch (e) {
        console.error('Error fetching user listings:', e);
        toHome();
      }
      setIsLoading(false);
    };
    
    fetchListings();
  }, [user, authLoading, navigate]);

  const handleDelete = async (id) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את המודעה? לא ניתן לשחזר פעולה זו.")) {
      try {
        await Vehicle.delete(id);
        setListings(prev => prev.filter(listing => listing.id !== id));
      } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("שגיאה במחיקת המודעה.");
      }
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <List className="w-8 h-8 text-blue-800" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">המודעות שלי</h1>
              <p className="text-gray-600">נהל את המודעות שפרסמת</p>
            </div>
          </div>
          <Link to={ROUTES.ADD_VEHICLE}>
            <Button className="bg-blue-800 text-white hover-lift hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5 ml-2" /> פרסם מודעה חדשה
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : listings.length > 0 ? (
          <div className="space-y-4">
            {listings.map(vehicle => (
              <MyListingItem key={vehicle.id} vehicle={vehicle} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass-effect rounded-2xl">
            <Car className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">עדיין לא פרסמת מודעות</h3>
            <p className="text-gray-500 mb-8">המודעה הראשונה שלך במרחק לחיצה אחת.</p>
            <Link to={ROUTES.ADD_VEHICLE}>
              <Button className="bg-blue-800 text-white px-8 py-3 text-lg hover-lift hover:bg-blue-700 transition-colors">
                פרסם מודעה ראשונה
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
