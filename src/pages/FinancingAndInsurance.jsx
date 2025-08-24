import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Landmark, Shield, Calculator, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FinancingAndInsurance() {
  const [loanAmount, setLoanAmount] = useState(150000);
  const [loanTerm, setLoanTerm] = useState(36);
  const interestRate = 5.5; // Example fixed interest rate

  const calculateMonthlyPayment = () => {
    if (loanAmount <= 0) return 0;
    const monthlyInterestRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTerm;
    const payment = 
      loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    return payment.toFixed(0);
  };

  const monthlyPayment = calculateMonthlyPayment();

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-800 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Landmark className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
            פתרונות מימון וביטוח
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            קבל הצעות מימון וביטוח אטרקטיביות מהשותפים המובילים שלנו וסגור עסקה בקלות.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Financing Section */}
          <Card className="glass-effect shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                מימון לרכב הבא שלך
              </CardTitle>
              <p className="text-gray-600">בשיתוף "מימון ישיר" וגופים מובילים נוספים</p>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">מחשבון מימון (הדמיה)</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סכום ההלוואה: ₪{loanAmount.toLocaleString()}</label>
                    <Slider
                      value={[loanAmount]}
                      onValueChange={(value) => setLoanAmount(value[0])}
                      max={500000}
                      step={5000}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">תקופת החזר (חודשים): {loanTerm}</label>
                    <Slider
                      value={[loanTerm]}
                      onValueChange={(value) => setLoanTerm(value[0])}
                      max={60}
                      min={12}
                      step={1}
                    />
                  </div>
                  <div className="text-center bg-gradient-to-r from-blue-50 to-amber-50 p-4 rounded-lg">
                    <p className="text-gray-600">החזר חודשי מוערך:</p>
                    <p className="text-3xl font-bold text-blue-800">₪{monthlyPayment}</p>
                    <p className="text-xs text-gray-500">לפי ריבית שנתית של {interestRate}%</p>
                  </div>
                </div>
              </div>
              <Button className="w-full h-14 bg-gradient-to-r from-blue-800 to-amber-500 text-white text-lg font-semibold hover-lift shadow-lg">
                <Landmark className="w-5 h-5 ml-2" />
                קבל הצעת מימון רשמית
              </Button>
            </CardContent>
          </Card>

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
                <ul className="space-y-3 text-right">
                  <li className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>ביטוח חובה, צד ג' ומקיף לרכבים מסחריים.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>התאמה אישית לאופי הפעילות של הרכב.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>שירותי דרך וגרירה ייעודיים לרכבים כבדים.</span>
                  </li>
                   <li className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>מחירים תחרותיים וליווי אישי.</span>
                  </li>
                </ul>
              <Button className="w-full h-14 bg-gradient-to-r from-green-600 to-blue-600 text-white text-lg font-semibold hover-lift shadow-lg">
                 <Shield className="w-5 h-5 ml-2" />
                קבל הצעת מחיר לביטוח
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}