import React, { useState } from 'react';
import { SendEmail } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Clock, CheckCircle, MessageSquare } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailContent = `
פנייה חדשה מהאתר צומת

פרטי הפונה:
שם: ${formData.name}
אימייל: ${formData.email}
טלפון: ${formData.phone || 'לא צוין'}

נושא: ${formData.subject}
קטגוריה: ${formData.category}

תוכן הפנייה:
${formData.message}

---
פנייה נשלחה מאתר צומת ב-${new Date().toLocaleString('he-IL')}
      `;

      await SendEmail({
        to: 'zometauto@gmail.com',
        subject: `פנייה חדשה מהאתר - ${formData.subject}`,
        message: emailContent,
        from: 'noreply@zomet.co.il',
        replyTo: formData.email
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('שגיאה בשליחת ההודעה. אנא נסה שוב.');
    }

    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <Card className="glass-effect shadow-xl border-0 max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">ההודעה נשלחה בהצלחה!</h2>
            <p className="text-gray-600 mb-6">
              תודה על פנייתך. נחזור אליך תוך 24 שעות במייל או בטלפון.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-blue-800 to-amber-500 text-white"
            >
              חזרה לעמוד הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-800 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
            שירות לקוחות
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            יש לך שאלה, בעיה או הצעה? נשמח לעזור לך ולענות על כל פנייה.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="glass-effect shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">שלח לנו הודעה</CardTitle>
                <p className="text-gray-600">מלא את הפרטים ונחזור אליך בהקדם</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                      <Input
                        placeholder="שם פרטי ומשפחה"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">אימייל *</label>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">טלפון</label>
                      <Input
                        placeholder="050-123-4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה *</label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="בחר נושא" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">בעיה טכנית באתר</SelectItem>
                          <SelectItem value="listing">בעיה עם מודעה</SelectItem>
                          <SelectItem value="payment">בעיה בתשלום</SelectItem>
                          <SelectItem value="general">שאלה כללית</SelectItem>
                          <SelectItem value="suggestion">הצעה לשיפור</SelectItem>
                          <SelectItem value="complaint">תלונה</SelectItem>
                          <SelectItem value="other">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">נושא ההודעה *</label>
                    <Input
                      placeholder="תאר בקצרה את הנושא"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">תוכן ההודעה *</label>
                    <Textarea
                      placeholder="תאר את הבעיה, השאלה או ההצעה שלך בפירוט..."
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      required
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-blue-800 to-amber-500 text-white text-lg font-semibold hover-lift shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                        שולח הודעה...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5 ml-2" />
                        שלח הודעה
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="glass-effect shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">פרטי קשר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">זמני תגובה</p>
                    <p className="text-gray-600 text-sm">תוך 24 שעות</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">זמינות</p>
                    <p className="text-gray-600 text-sm">7 ימים בשבוע</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect shadow-xl border-0 bg-gradient-to-r from-blue-50 to-amber-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">נושאים נפוצים</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• בעיות טכניות באתר</li>
                  <li>• עזרה בפרסום מודעה</li>
                  <li>• בעיות בתשלום</li>
                  <li>• שאלות על המחירון</li>
                  <li>• הצעות לשיפור</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}