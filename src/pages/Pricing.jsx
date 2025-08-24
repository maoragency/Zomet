import React, { useState, useEffect } from "react";
import { PricingPlan } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Phone, Mail } from "lucide-react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await PricingPlan.list();
      setPlans(data);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const defaultPlans = [
    {
      id: "basic",
      name: "מודעה בסיסית",
      price: 0,
      duration_days: 30,
      features: [
        "מיקום נמוך ביחס למשודרגים",
        "פחות חשיפה",
        "עד 5 תמונות",
        "מידע בסיסי על הרכב",
        "פרטי קשר"
      ],
      max_images: 5,
      is_featured: false,
      priority_support: false,
      icon: Zap,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50"
    },
    {
      id: "featured",
      name: "מודעה מודגשת",
      price: 119.90,
      duration_days: 30,
      features: [
        "חשיפה גבוהה יותר מהרגילה בבסיסית",
        "מיקום גבוה יותר בעמודי החיפוש",
        "עד 10 תמונות",
        "עדיפות בתוצאות חיפוש",
        "תמיכה מועדפת"
      ],
      max_images: 10,
      is_featured: true,
      priority_support: true,
      icon: Star,
      color: "from-gray-400 to-gray-600",
      bgColor: "bg-gray-50",
      popular: true
    },
    {
      id: "premium",
      name: "מודעה פרימיום",
      price: 179.90,
      duration_days: 45,
      features: [
        "הדרך למכור מהר ולקבל את המחיר המקסימלי!",
        "מקסימום חשיפה ובראש התוצאות",
        "עד 15 תמונות באיכות גבוהה",
        "תמיכה VIP 24/7",
        "דוח צפיות מפורט"
      ],
      max_images: 15,
      is_featured: true,
      priority_support: true,
      icon: Crown,
      color: "from-yellow-500 to-amber-600",
      bgColor: "bg-yellow-50"
    }
  ];

  const plansToShow = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
            חבילות הדגשה מקצועיות
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            הדגש את המודעה שלך וקבל יותר צפיות, יותר פניות ומכירה מהירה יותר
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plansToShow.map((plan, index) => {
            const IconComponent = plan.icon || Zap;
            return (
              <Card 
                key={plan.id || index} 
                className={`relative glass-effect border-0 shadow-xl hover-lift ${
                  plan.popular ? 'premium-glow' : ''
                } ${plan.bgColor || 'bg-white'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1">
                      הכי פופולרי!
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="text-4xl font-bold gradient-text mb-2">
                    {plan.price === 0 ? 'חינם' : `₪${plan.price}`}
                  </div>
                  <p className="text-gray-600">{plan.duration_days} ימים</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full h-12 text-lg font-semibold rounded-xl transition-all duration-300 ${
                      plan.price === 0 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : `bg-gradient-to-r ${plan.color} ${plan.name === 'מודעה פרימיום' ? 'text-white' : 'text-gray-900'} hover:scale-105 shadow-lg`
                    }`}
                  >
                    {plan.price === 0 ? 'התחל חינם' : 'שדרג עכשיו'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </div>
  );
}