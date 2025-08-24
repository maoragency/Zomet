
import React, { useState, useEffect } from "react";
import { BuyerRequest as BuyerRequestEntity, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, CheckCircle, Phone, Mail, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/hooks/useAuth";

export default function BuyerRequest() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    buyer_name: "",
    buyer_phone: "",
    // buyer_email: "", // Removed as per requirements
    vehicle_type: "",
    preferred_manufacturer: "",
    max_budget: "",
    min_year: "",
    max_kilometers: "",
    preferred_location: "",
    additional_requirements: "",
    urgency: ""
  });

  useEffect(() => {
    // Check authentication when auth loading is complete
    if (!authLoading && !user) {
      alert("עליך להיות מחובר כדי לשלוח בקשת קונה.");
      navigate(createPageUrl("Home"));
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestData = {
        title: `בקשת קונה - ${formData.vehicle_type} ${formData.preferred_manufacturer}`.trim(),
        description: `מחפש: ${formData.vehicle_type}${formData.preferred_manufacturer ? ` מ${formData.preferred_manufacturer}` : ''}
תקציב: עד ₪${parseInt(formData.max_budget).toLocaleString()}
${formData.min_year ? `שנה מינימלית: ${formData.min_year}` : ''}
${formData.max_kilometers ? `קילומטראז' מקסימלי: ${parseInt(formData.max_kilometers).toLocaleString()}` : ''}
${formData.preferred_location ? `אזור מועדף: ${formData.preferred_location}` : ''}
${formData.urgency ? `רמת דחיפות: ${formData.urgency}` : ''}
${formData.additional_requirements ? `דרישות נוספות: ${formData.additional_requirements}` : ''}`,
        budget_min: Math.floor(parseInt(formData.max_budget) * 0.8), // 80% of max budget as min
        budget_max: parseInt(formData.max_budget),
        contact_name: formData.buyer_name,
        contact_phone: formData.buyer_phone,
        contact_email: user?.email || null,
        created_by: user?.id || null,
        status: 'פעיל'
      };

      const result = await BuyerRequestEntity.create(requestData);
      
      if (result) {
        alert('הבקשה נשלחה בהצלחה! המתווך שלנו יחזור אליך בהקדם.');
        navigate(createPageUrl("Home"));
      } else {
        throw new Error('Failed to create buyer request');
      }
    } catch (error) {
      console.error("Error creating buyer request:", error);
      alert('אירעה שגיאה בשליחת הבקשה. אנא נסה שוב או צור קשר ישירות.');
    }

    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
        <p className="ml-4 text-lg">מאמת פרטי משתמש...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">מחפש רכב מסוים?</h1>
          <p className="text-xl text-gray-600">תן לנו לעזור לך למצוא את הרכב המושלם</p>
          <p className="text-lg text-green-600 mt-2 font-medium">המתווך המקצועי שלנו יחפש עבורך</p>
        </div>

        {/* Service Description */}
        <Card className="glass-effect shadow-lg border-0 bg-gradient-to-r from-green-50 to-blue-50 mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">איך זה עובד?</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">תמלא פרטים</h3>
                  <p className="text-sm text-gray-600">ספר לנו איזה רכב אתה מחפש</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-50 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">נחפש עבורך</h3>
                  <p className="text-sm text-gray-600">המומחה שלנו יחפש את הרכב המתאים</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">נחבר אותך</h3>
                  <p className="text-sm text-gray-600">נחבר אותך ישירות למוכר המתאים</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800 font-medium">💰 עמלה: ₪1,500 רק במקרה של רכישה מוצלחת</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                  <Input
                    placeholder="שם פרטי ומשפחה"
                    value={formData.buyer_name}
                    onChange={(e) => handleInputChange("buyer_name", e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טלפון *</label>
                  <Input
                    placeholder="050-123-4567"
                    value={formData.buyer_phone}
                    onChange={(e) => handleInputChange("buyer_phone", e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                {/* Email field removed */}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Requirements */}
          <Card className="glass-effect shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">מה אתה מחפש?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סוג רכב *</label>
                  <Select value={formData.vehicle_type} onValueChange={(value) => handleInputChange("vehicle_type", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="בחר סוג רכב" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="מיניבוס">מיניבוס</SelectItem>
                      <SelectItem value="אוטובוס">אוטובוס</SelectItem>
                      <SelectItem value="משאית">משאית</SelectItem>
                      <SelectItem value="טנדר">טנדר</SelectItem>
                      <SelectItem value="רכב מסחרי">רכב מסחרי</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                      <SelectItem value="לא משנה">לא משנה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">יצרן מועדף</label>
                  <Input
                    placeholder="מרצדס, פולקסווגן, פיאט וכו'"
                    value={formData.preferred_manufacturer}
                    onChange={(e) => handleInputChange("preferred_manufacturer", e.target.value)}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תקציב מקסימלי *</label>
                  <Input
                    type="number"
                    placeholder="300000"
                    min="0"
                    value={formData.max_budget}
                    onChange={(e) => handleInputChange("max_budget", e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שנת ייצור מינימלית</label>
                  <Input
                    type="number"
                    placeholder="2015"
                    min="1990"
                    max="2024"
                    value={formData.min_year}
                    onChange={(e) => handleInputChange("min_year", e.target.value)}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">קילומטראז' מקסימלי</label>
                  <Input
                    type="number"
                    placeholder="200000"
                    min="0"
                    value={formData.max_kilometers}
                    onChange={(e) => handleInputChange("max_kilometers", e.target.value)}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">אזור מועדף</label>
                  <Input
                    placeholder="מרכז, צפון, דרום וכו'"
                    value={formData.preferred_location}
                    onChange={(e) => handleInputChange("preferred_location", e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">רמת דחיפות *</label>
                <Select value={formData.urgency} onValueChange={(value) => handleInputChange("urgency", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="כמה דחוף זה?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="דחוף - תוך שבוע">🔴 דחוף - תוך שבוע</SelectItem>
                    <SelectItem value="רגיל - תוך חודש">🟡 רגיל - תוך חודש</SelectItem>
                    <SelectItem value="גמיש - אין בהול">🟢 גמיש - אין בהול</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">דרישות נוספות</label>
                <Textarea
                  placeholder="ציוד מיוחד, מצב הרכב, דרישות נוספות..."
                  value={formData.additional_requirements}
                  onChange={(e) => handleInputChange("additional_requirements", e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center pt-8">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-12 py-4 rounded-xl text-lg font-semibold hover-lift shadow-lg disabled:opacity-50 bg-gradient-to-r from-green-600 to-blue-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                  שולח בקשה...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 ml-2" />
                  שלח בקשה למתווך המקצועי
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-4">נחזור אליך תוך 24 שעות</p>
          </div>
        </form>
      </div>
    </div>
  );
}
