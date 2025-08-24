import React from 'react';
import { Shield, CheckCircle, Users, Lock, Star, Award } from 'lucide-react';

const TrustIndicators = ({ variant = 'default' }) => {
  const indicators = [
    {
      icon: Shield,
      text: 'מאובטח SSL',
      description: 'הצפנה ברמה בנקאית'
    },
    {
      icon: CheckCircle,
      text: 'מאומת ובטוח',
      description: 'כל המשתמשים מאומתים'
    },
    {
      icon: Users,
      text: '50K+ משתמשים',
      description: 'קהילה פעילה ומשגשגת'
    },
    {
      icon: Lock,
      text: 'פרטיות מוגנת',
      description: 'הנתונים שלכם מוגנים'
    },
    {
      icon: Star,
      text: '4.9/5 דירוג',
      description: 'שביעות רצון גבוהה'
    },
    {
      icon: Award,
      text: 'מוכר בישראל',
      description: 'הפלטפורמה המובילה'
    }
  ];

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center space-x-6 rtl:space-x-reverse">
        {indicators.slice(0, 3).map((indicator, index) => {
          const Icon = indicator.icon;
          return (
            <div key={index} className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500">
              <Icon className="h-4 w-4" />
              <span>{indicator.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {indicators.map((indicator, index) => {
        const Icon = indicator.icon;
        return (
          <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
            <div className="bg-white rounded-lg p-2">
              <Icon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{indicator.text}</div>
              <div className="text-xs text-gray-500">{indicator.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrustIndicators;