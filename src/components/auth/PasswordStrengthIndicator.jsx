import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X, Shield, AlertTriangle } from 'lucide-react';

const PasswordStrengthIndicator = ({ password, checks, strength }) => {
  const getStrengthText = () => {
    if (strength < 20) return 'חלשה מאוד';
    if (strength < 40) return 'חלשה';
    if (strength < 60) return 'בינונית';
    if (strength < 80) return 'חזקה';
    return 'חזקה מאוד';
  };

  const getStrengthColor = () => {
    if (strength < 20) return 'text-red-600';
    if (strength < 40) return 'text-orange-600';
    if (strength < 60) return 'text-yellow-600';
    if (strength < 80) return 'text-blue-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (strength < 20) return '[&>div]:bg-red-500';
    if (strength < 40) return '[&>div]:bg-orange-500';
    if (strength < 60) return '[&>div]:bg-yellow-500';
    if (strength < 80) return '[&>div]:bg-gradient-to-r from-blue-50 to-amber-500';
    return '[&>div]:bg-green-500';
  };

  const getStrengthIcon = () => {
    if (strength < 40) return <AlertTriangle className="h-4 w-4" />;
    if (strength >= 80) return <Shield className="h-4 w-4" />;
    return null;
  };

  if (!password) return null;

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {getStrengthIcon()}
          <span className="font-medium text-gray-700">חוזק הסיסמה:</span>
        </div>
        <span className={`font-semibold ${getStrengthColor()}`}>
          {getStrengthText()}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={strength} 
        className={`h-2 ${getProgressColor()}`}
      />
      
      {/* Checks Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center ${checks.length ? 'text-green-600' : 'text-gray-400'}`}>
          {checks.length ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
          8+ תווים
        </div>
        <div className={`flex items-center ${checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
          {checks.uppercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
          אות גדולה
        </div>
        <div className={`flex items-center ${checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
          {checks.lowercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
          אות קטנה
        </div>
        <div className={`flex items-center ${checks.number ? 'text-green-600' : 'text-gray-400'}`}>
          {checks.number ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
          מספר
        </div>
        <div className={`flex items-center ${checks.special ? 'text-green-600' : 'text-gray-400'} col-span-2`}>
          {checks.special ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
          תו מיוחד (!@#$%^&*)
        </div>
      </div>

      {/* Security Tips */}
      {strength < 60 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2 rtl:space-x-reverse">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">טיפים לסיסמה חזקה יותר:</p>
              <ul className="space-y-1">
                {!checks.length && <li>• הוסיפו לפחות 8 תווים</li>}
                {!checks.uppercase && <li>• הוסיפו אות גדולה (A-Z)</li>}
                {!checks.lowercase && <li>• הוסיפו אות קטנה (a-z)</li>}
                {!checks.number && <li>• הוסיפו מספר (0-9)</li>}
                {!checks.special && <li>• הוסיפו תו מיוחד (!@#$%^&*)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {strength >= 80 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-800 font-medium">
              מעולה! הסיסמה שלכם חזקה ומאובטחת
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;