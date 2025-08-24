import React from 'react';
import { Car, Loader2 } from 'lucide-react';

const AuthLoader = ({ message = 'טוען...', variant = 'default' }) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center space-y-6">
        {/* Animated Logo */}
        <div className="relative">
          <div className="bg-blue-600 rounded-2xl p-4 mx-auto w-fit transform animate-pulse">
            <Car className="h-12 w-12 text-white" />
          </div>
          <div className="absolute inset-0 bg-blue-600 rounded-2xl animate-ping opacity-20"></div>
        </div>

        {/* Brand */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">צומת</h1>
          <p className="text-gray-600 text-sm mb-4">מרכז הרכב הישראלי</p>
        </div>

        {/* Loading Animation */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
          </div>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="bg-gray-200 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoader;