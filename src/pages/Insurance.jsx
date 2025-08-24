
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Phone, Mail } from 'lucide-react';

export default function Insurance() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
            ביטוח מקיף ומותאם אישית
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            הצעות מחיר מסוכנויות הביטוח המובילות במיוחד לרכבים מסחריים והסעות.
          </p>
        </div>

        {/* Insurance Section */}
        <Card className="glass-effect shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              ביטוח מקיף ומותאם אישית
            </CardTitle>
            <p className="text-gray-600">הצעות מחיר מסוכנויות הביטוח המובילות</p>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">סוגי ביטוח זמינים:</h3>
                <ul className="space-y-3 text-right">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>ביטוח חובה מותאם לרכבים מסחריים</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>ביטוח צד שלישי מורחב</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>ביטוח מקיף לאוטובוסים ומיניבוסים</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>ביטוח נהגים ונוסעים</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">שירותים נוספים:</h3>
                <ul className="space-y-3 text-right">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>שירותי דרך וגרירה ייעודיים לרכבים כבדים</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>התאמה אישית לאופי הפעילות של הרכב</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>מחירים תחרותיים וליווי אישי</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>טיפול מהיר בתביעות</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">למה לבחור בנו?</h3>
              <p className="text-green-700">
                אנחנו מתמחים בביטוח רכבים מסחריים ורכבי הסעות. הצוות המקצועי שלנו 
                יעזור לך למצוא את הפוליסה המתאימה ביותר במחיר הטוב ביותר.
              </p>
            </div>

            <Button className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold hover-lift shadow-lg">
              <Shield className="w-5 h-5 ml-2" />
              קבל הצעת מחיר לביטוח
            </Button>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-16 text-center glass-effect p-12 rounded-3xl">
          <h2 className="text-3xl font-bold gradient-text mb-4">
            זקוק לייעוץ נוסף?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
             נשמח לעמוד לרשותך בכל שאלה.
          </p>
        </div>
      </div>
    </div>
  );
}
