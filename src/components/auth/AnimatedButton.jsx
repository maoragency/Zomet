import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const AnimatedButton = ({ 
  children, 
  isLoading = false, 
  loadingText = 'טוען...', 
  variant = 'default',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'login':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-blue-700 hover:to-blue-800 text-white';
      case 'signup':
        return 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white';
      case 'reset':
        return 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300';
      default:
        return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-blue-700 hover:to-blue-800 text-white';
    }
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <Button
      type={type}
      className={`
        w-full h-12 font-semibold rounded-xl transition-all duration-200 
        transform hover:scale-[1.02] shadow-lg hover:shadow-xl
        ${getVariantStyles()}
        ${isPressed ? 'scale-[0.98]' : ''}
        ${isLoading ? 'cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
          {children}
        </div>
      )}
    </Button>
  );
};

export default AnimatedButton;