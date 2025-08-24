import React, { forwardRef, useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAccessibilityAnnouncer } from '@/hooks/useAccessibilityAnnouncer';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Enhanced Form Field component with accessibility features
 */
export const AccessibleFormField = forwardRef(({
  label,
  error,
  success,
  hint,
  required = false,
  children,
  className,
  ...props
}, ref) => {
  const fieldId = useId();
  const errorId = useId();
  const hintId = useId();
  const { isEnabled, screenReaderMode } = useAccessibility();
  const { announceError } = useAccessibilityAnnouncer();

  // Announce errors when they appear
  React.useEffect(() => {
    if (error) {
      announceError(error);
    }
  }, [error, announceError]);

  const describedBy = [
    hint && hintId,
    error && errorId
  ].filter(Boolean).join(' ');

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label 
          htmlFor={fieldId}
          className={cn(
            'block text-sm font-medium',
            required && 'after:content-["*"] after:text-red-500 after:ml-1',
            isEnabled && 'accessibility-enhanced-label'
          )}
        >
          {label}
          {required && screenReaderMode && (
            <span className="sr-only"> (שדה חובה)</span>
          )}
        </Label>
      )}
      
      {hint && (
        <p 
          id={hintId}
          className="text-sm text-muted-foreground"
          role="note"
        >
          {hint}
        </p>
      )}

      <div className="relative">
        {React.cloneElement(children, {
          id: fieldId,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? 'true' : 'false',
          'aria-required': required,
          className: cn(
            children.props.className,
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            success && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            isEnabled && 'accessibility-enhanced-input'
          ),
          ref
        })}

        {/* Status Icons */}
        {(error || success) && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {error && (
              <AlertCircle 
                className="h-4 w-4 text-red-500" 
                aria-hidden="true"
              />
            )}
            {success && (
              <CheckCircle 
                className="h-4 w-4 text-green-500" 
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}

      {success && (
        <p 
          className="text-sm text-green-600 flex items-center gap-1"
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          {success}
        </p>
      )}
    </div>
  );
});

AccessibleFormField.displayName = 'AccessibleFormField';

/**
 * Enhanced Input component with accessibility features
 */
export const AccessibleInput = forwardRef(({
  type = 'text',
  placeholder,
  className,
  ...props
}, ref) => {
  const { isEnabled } = useAccessibility();

  return (
    <Input
      ref={ref}
      type={type}
      placeholder={placeholder}
      className={cn(
        'transition-colors',
        isEnabled && [
          'focus:ring-2 focus:ring-offset-2',
          'min-h-[44px]', // WCAG touch target size
        ],
        className
      )}
      {...props}
    />
  );
});

AccessibleInput.displayName = 'AccessibleInput';

/**
 * Enhanced Textarea component with accessibility features
 */
export const AccessibleTextarea = forwardRef(({
  placeholder,
  className,
  rows = 4,
  ...props
}, ref) => {
  const { isEnabled } = useAccessibility();

  return (
    <Textarea
      ref={ref}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'transition-colors resize-vertical',
        isEnabled && [
          'focus:ring-2 focus:ring-offset-2',
          'min-h-[88px]', // Minimum height for accessibility
        ],
        className
      )}
      {...props}
    />
  );
});

AccessibleTextarea.displayName = 'AccessibleTextarea';

/**
 * Enhanced Select component with accessibility features
 */
export const AccessibleSelect = forwardRef(({
  placeholder = 'בחר אפשרות...',
  children,
  className,
  onValueChange,
  ...props
}, ref) => {
  const { isEnabled } = useAccessibility();
  const { announceContentChange } = useAccessibilityAnnouncer();

  const handleValueChange = (value) => {
    onValueChange?.(value);
    
    // Announce selection change
    const selectedOption = React.Children.toArray(children)
      .find(child => child.props.value === value);
    
    if (selectedOption) {
      announceContentChange(`נבחר: ${selectedOption.props.children}`);
    }
  };

  return (
    <Select onValueChange={handleValueChange} {...props}>
      <SelectTrigger 
        ref={ref}
        className={cn(
          isEnabled && [
            'min-h-[44px]', // WCAG touch target size
            'focus:ring-2 focus:ring-offset-2'
          ],
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
});

AccessibleSelect.displayName = 'AccessibleSelect';

/**
 * Form Group component for related fields
 */
export const AccessibleFormGroup = ({
  legend,
  description,
  children,
  className,
  ...props
}) => {
  const groupId = useId();
  const descriptionId = useId();

  return (
    <fieldset 
      className={cn('space-y-4', className)}
      aria-labelledby={groupId}
      aria-describedby={description ? descriptionId : undefined}
      {...props}
    >
      {legend && (
        <legend 
          id={groupId}
          className="text-lg font-semibold text-foreground"
        >
          {legend}
        </legend>
      )}
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  );
};

/**
 * Form component with enhanced accessibility
 */
export const AccessibleForm = forwardRef(({
  children,
  onSubmit,
  className,
  noValidate = true,
  ...props
}, ref) => {
  const { isEnabled } = useAccessibility();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      className={cn(
        'space-y-6',
        isEnabled && 'accessibility-enhanced-form',
        className
      )}
      {...props}
    >
      {children}
    </form>
  );
});

AccessibleForm.displayName = 'AccessibleForm';

export {
  AccessibleFormField as FormField,
  AccessibleInput as Input,
  AccessibleTextarea as Textarea,
  AccessibleSelect as Select,
  AccessibleFormGroup as FormGroup,
  AccessibleForm as Form,
};