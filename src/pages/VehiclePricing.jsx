import React, { useState } from 'react';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, TrendingUp, AlertCircle, CheckCircle, DollarSign, BarChart3 } from 'lucide-react';

export default function VehiclePricing() {
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    year: '',
    kilometers: '',
    vehicleType: '',
    condition: '',
    additionalInfo: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriceEstimate = async () => {
    if (!formData.manufacturer || !formData.model || !formData.year) {
      alert('אנא מלא את השדות החובה: יצרן, דגם ושנת ייצור');
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `
אנא ספק הערכת מחיר מדויקת לרכב מסחרי/אוטובוס/מיניבוס עם הפרטים הבאים:

יצרן: ${formData.manufacturer}
דגם: ${formData.model}
שנת ייצור: ${formData.year}
קילומטראז': ${formData.kilometers || 'לא צוין'}
סוג רכב: ${formData.vehicleType || 'לא צוין'}
מצב הרכב: ${formData.condition || 'לא צוין'}
מידע נוסף: ${formData.additionalInfo || 'אין'}

אנא חפש במאגרי נתונים עדכניים ובאתרים רלוונטיים בישראל כמו יד2, אוטו, גרירה, אוטוטריידר ואתרים דומים, וספק את המידע הבא:

1. הערכת מחיר (טווח מינימום-מקסימום בשקלים)
2. מחיר ממוצע צפוי
3. גורמים שמשפיעים על המחיר (חיובי ושלילי)
4. מגמות שוק נוכחיות לסוג רכב זה
5. המלצות לשיפור ערך המכירה

התשובה צריכה להיות מבוססת על נתוני שוק עדכניים מישראל, עם התייחסות מיוחדת לרכבים מסחריים ורכבי הסעות.
      `;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        context: {
          vehicle: {
            manufacturer: formData.manufacturer,
            model: formData.model,
            year: formData.year,
            kilometers: formData.kilometers,
            vehicleType: formData.vehicleType,
            condition: formData.condition
          }
        },
        options: {
          response_json_schema: {
            type: "object",
            properties: {
              price_range: {
                type: "object",
                properties: {
                  min_price: { type: "number" },
                  max_price: { type: "number" }
                }
              },
              average_price: { type: "number" },
              factors_affecting_price: {
                type: "object",
                properties: {
                  positive_factors: { type: "array", items: { type: "string" } },
                  negative_factors: { type: "array", items: { type: "string" } }
                }
              },
              market_trends: { type: "string" },
              improvement_recommendations: { type: "array", items: { type: "string" } },
              confidence_level: { type: "string" },
              data_sources: { type: "string" }
            }
          }
        }
      });

      // Handle both direct response and wrapped response formats
      const resultData = response.response || response;

      setResult(resultData);
    } catch (error) {
      console.error('Error getting price estimate:', error);
      alert('שגיאה בקבלת הערכת המחיר. אנא נסה שוב.');
    }

    setIsLoading(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calculator className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
            מחירון רכב חכם
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            קבל הערכת מחיר מדויקת ומעודכנת לרכב שלך על בסיס נתוני שוק עדכניים
          </p>
        </div>

        {/* Input Form */}
        <Card className="glass-effect shadow-xl border-0 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              פרטי הרכב
            </CardTitle>
            <p className="text-gray-600">מלא את הפרטים כדי לקבל הערכת מחיר מדויקת</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">יצרן *</label>
                <Input
                  placeholder="מרצדס, מאן, דאף, וולבו..."
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                  className="h-12"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">דגם *</label>
                <Input
                  placeholder="ספרינטר, אטגו, CF, 9700..."
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שנת ייצור *</label>
                <Input
                  type="number"
                  placeholder="2020"
                  min="1990"
                  max="2024"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קילומטראז'</label>
                <Input
                  type="number"
                  placeholder="150000"
                  value={formData.kilometers}
                  onChange={(e) => handleInputChange('kilometers', e.target.value)}
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוג רכב</label>
                <Select value={formData.vehicleType} onValueChange={(value) => handleInputChange('vehicleType', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="בחר סוג רכב" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="מיניבוס">מיניבוס</SelectItem>
                    <SelectItem value="אוטובוס">אוטובוס</SelectItem>
                    <SelectItem value="משאית">משאית</SelectItem>
                    <SelectItem value="טנדר">טנדר</SelectItem>
                    <SelectItem value="רכב מסחרי">רכב מסחרי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מצב הרכב</label>
                <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="בחר מצב" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="מעולה">מעולה</SelectItem>
                    <SelectItem value="טוב מאוד">טוב מאוד</SelectItem>
                    <SelectItem value="טוב">טוב</SelectItem>
                    <SelectItem value="בינוני">בינוני</SelectItem>
                    <SelectItem value="דורש שיפוץ">דורש שיפוץ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מידע נוסף</label>
              <Textarea
                placeholder="ציוד מיוחד, שיפוצים שנעשו, היסטוריית תחזוקה..."
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={getPriceEstimate}
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-green-600 to-blue-600 text-white text-lg font-semibold hover-lift shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                  מחשב הערכת מחיר...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 ml-2" />
                  קבל הערכת מחיר
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="glass-effect shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-green-600" />
                הערכת מחיר
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Price Range */}
              <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">טווח מחירים צפוי</h3>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">מחיר מינימום</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(result.price_range?.min_price || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">מחיר ממוצע</p>
                    <p className="text-4xl font-bold gradient-text">
                      {formatPrice(result.average_price || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">מחיר מקסימום</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPrice(result.price_range?.max_price || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Positive Factors */}
                {result.factors_affecting_price?.positive_factors && (
                  <div className="bg-green-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      גורמים חיוביים
                    </h4>
                    <ul className="space-y-2">
                      {result.factors_affecting_price.positive_factors.map((factor, index) => (
                        <li key={index} className="text-green-700 text-sm">• {factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Negative Factors */}
                {result.factors_affecting_price?.negative_factors && (
                  <div className="bg-red-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      גורמים שליליים
                    </h4>
                    <ul className="space-y-2">
                      {result.factors_affecting_price.negative_factors.map((factor, index) => (
                        <li key={index} className="text-red-700 text-sm">• {factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Market Trends */}
              {result.market_trends && (
                <div className="bg-gradient-to-r from-blue-50 to-amber-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    מגמות שוק נוכחיות
                  </h4>
                  <p className="text-blue-700">{result.market_trends}</p>
                </div>
              )}

              {/* Recommendations */}
              {result.improvement_recommendations && (
                <div className="bg-amber-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    המלצות לשיפור ערך המכירה
                  </h4>
                  <ul className="space-y-2">
                    {result.improvement_recommendations.map((rec, index) => (
                      <li key={index} className="text-amber-700 text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-gray-50 p-6 rounded-xl text-center">
                <p className="text-gray-600 text-sm">
                  <strong>הערה חשובה:</strong> הערכת המחיר מבוססת על נתוני שוק עדכניים ואלגוריתמים מתקדמים.
                  המחיר הסופי עשוי להשתנות בהתאם לגורמים נוספים ולמצב השוק בפועל.
                  {result.confidence_level && ` רמת ביטחון: ${result.confidence_level}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}