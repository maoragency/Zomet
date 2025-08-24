import React from 'react';
import { Car, Shield, Zap, Users, Star, Award, TrendingUp, Heart } from 'lucide-react';

const AuthBackground = ({ variant = 'login' }) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'signup':
        return 'from-purple-600 via-purple-700 to-blue-700';
      case 'forgot':
        return 'from-blue-600 via-indigo-700 to-purple-700';
      case 'reset':
        return 'from-green-600 via-blue-700 to-purple-700';
      default:
        return 'from-blue-600 via-blue-700 to-purple-700';
    }
  };

  const getFeatures = () => {
    const baseFeatures = [
      {
        icon: Shield,
        title: 'בטיחות מקסימלית',
        description: 'כל המוכרים מאומתים ובדוקים'
      },
      {
        icon: Zap,
        title: 'מהיר ויעיל',
        description: 'מוצא את הרכב המושלם תוך דקות'
      },
      {
        icon: Users,
        title: 'קהילה פעילה',
        description: 'אלפי רכבים חדשים מדי יום'
      }
    ];

    if (variant === 'signup') {
      return [
        {
          icon: Star,
          title: 'הרשמה חינם',
          description: 'ללא עלויות נסתרות או התחייבות'
        },
        {
          icon: Shield,
          title: 'מוגן ומאובטח',
          description: 'הנתונים שלכם מוגנים ברמה הגבוהה ביותר'
        },
        {
          icon: TrendingUp,
          title: 'התחלה מהירה',
          description: 'תוכלו להתחיל למכור ולקנות תוך דקות'
        }
      ];
    }

    return baseFeatures;
  };

  const getStats = () => {
    return [
      { value: '50K+', label: 'משתמשים' },
      { value: '15K+', label: 'רכבים' },
      { value: '98%', label: 'שביעות רצון' }
    ];
  };

  const getTitle = () => {
    switch (variant) {
      case 'signup':
        return 'הצטרפו לקהילה\nהגדולה בישראל';
      case 'forgot':
        return 'איפוס סיסמה\nמאובטח ומהיר';
      case 'reset':
        return 'סיסמה חדשה\nלחשבון מוגן';
      default:
        return 'הפלטפורמה המובילה\nלרכב בישראל';
    }
  };

  const getDescription = () => {
    switch (variant) {
      case 'signup':
        return 'קבלו גישה מיידית לאלפי רכבים, כלים מתקדמים ותמיכה מקצועית';
      case 'forgot':
        return 'נשלח לכם קישור מאובטח לאיפוס הסיסמה תוך דקות ספורות';
      case 'reset':
        return 'בחרו סיסמה חזקה וחדשה כדי לשמור על החשבון שלכם מוגן';
      default:
        return 'הצטרף לאלפי משתמשים שכבר מוכרים וקונים רכבים בביטחון ובקלות';
    }
  };

  return (
    <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${getGradientColors()} p-12 flex-col justify-between relative overflow-hidden`}>
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-white rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-20 w-12 h-12 bg-white rounded-full animate-pulse delay-2000"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full animate-pulse delay-500"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-1000"></div>
      </div>
      
      {/* Logo & Brand */}
      <div className="relative z-10">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 transform hover:scale-105 transition-transform duration-300">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">צומת</h1>
            <p className="text-blue-100 text-sm">מרכז הרכב הישראלי</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
            {getTitle()}
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            {getDescription()}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          {getFeatures().map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="flex items-center space-x-4 rtl:space-x-reverse transform hover:translate-x-2 rtl:hover:-translate-x-2 transition-transform duration-300"
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="text-blue-100 text-sm">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats or Social Proof */}
      <div className="relative z-10">
        {variant === 'signup' ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full border-2 border-white animate-pulse"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full border-2 border-white animate-pulse delay-300"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full border-2 border-white animate-pulse delay-600"></div>
              </div>
              <div>
                <p className="text-white font-semibold">+1,200 הצטרפו השבוע</p>
                <p className="text-purple-100 text-sm">משתמשים חדשים</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {getStats().map((stat, index) => (
              <div key={index} className="text-center transform hover:scale-105 transition-transform duration-300">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-blue-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthBackground;