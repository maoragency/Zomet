import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { messagingService } from '@/services/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Bell,
  Settings,
  User,
  Car,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Reply,
  Archive,
  MoreHorizontal,
  Plus,
  RefreshCw
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { he } from 'date-fns/locale';

export default function MessagingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageFilter, setMessageFilter] = useState('all');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  
  // Refs
  const messagesEndRef = useRef(null);

  // Load messages and conversations
  const loadMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get inbox messages
      const inboxResponse = await messagingService.getInbox({ 
        pageSize: 50,
        includeRead: true 
      });
      
      if (inboxResponse.success) {
        setMessages(inboxResponse.data.messages || []);
        
        // Group messages into conversations
        const conversationMap = new Map();
        inboxResponse.data.messages?.forEach(message => {
          const conversationKey = message.sender_id;
          if (!conversationMap.has(conversationKey)) {
            conversationMap.set(conversationKey, {
              id: conversationKey,
              participant: {
                id: message.sender_id,
                name: message.sender_name || 'משתמש',
                email: message.sender_email || '',
                avatar: null
              },
              lastMessage: message,
              unreadCount: 0,
              messages: []
            });
          }
          
          const conversation = conversationMap.get(conversationKey);
          conversation.messages.push(message);
          
          if (!message.is_read) {
            conversation.unreadCount++;
          }
          
          // Update last message if this one is newer
          if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
            conversation.lastMessage = message;
          }
        });
        
        setConversations(Array.from(conversationMap.values()));
      }
      
      // Get notifications (system messages)
      const notificationsResponse = await messagingService.getInbox({ 
        messageType: 'system',
        pageSize: 20 
      });
      
      if (notificationsResponse.success) {
        setNotifications(notificationsResponse.data.messages || []);
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('שגיאה בטעינת ההודעות');
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את ההודעות. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        recipient_id: selectedConversation.participant.id,
        subject: 'הודעה חדשה',
        content: newMessage.trim(),
        message_type: 'user'
      };
      
      const response = await messagingService.sendMessage(messageData);
      
      if (response.success) {
        // Add message to conversation
        const newMsg = {
          id: response.data.id,
          content: newMessage.trim(),
          sender_id: user.id,
          recipient_id: selectedConversation.participant.id,
          created_at: new Date().toISOString(),
          is_read: false,
          sender_name: user.full_name || user.email,
          sender_email: user.email
        };
        
        setSelectedConversation(prev => ({
          ...prev,
          messages: [...prev.messages, newMsg],
          lastMessage: newMsg
        }));
        
        // Update conversations list
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessage: newMsg, messages: [...conv.messages, newMsg] }
            : conv
        ));
        
        setNewMessage('');
        
        toast({
          title: "הצלחה",
          description: "ההודעה נשלחה בהצלחה"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשלוח את ההודעה. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      await messagingService.markAsRead(messageId);
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
      
      if (selectedConversation) {
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      await messagingService.deleteMessage(messageId);
      
      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      if (selectedConversation) {
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== messageId)
        }));
      }
      
      toast({
        title: "הצלחה",
        description: "ההודעה נמחקה בהצלחה"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את ההודעה. נסה שוב.",
        variant: "destructive"
      });
    }
  };

  // Format date for display
  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'אתמול';
    } else {
      return format(date, 'dd/MM', { locale: he });
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    return (
      conv.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Filter messages based on filter
  const filteredMessages = messages.filter(msg => {
    switch (messageFilter) {
      case 'unread':
        return !msg.is_read;
      case 'read':
        return msg.is_read;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="space-y-6 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">הודעות</h1>
            <p className="text-sm text-gray-600">טוען הודעות...</p>
          </div>
          <div className="dashboard-spinner"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <Card className="dashboard-card animate-pulse border-gray-200">
            <CardHeader className="pb-3">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 dashboard-card animate-pulse border-gray-200">
            <CardContent className="p-6">
              <div className="h-full bg-gray-200 rounded-lg"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">הודעות</h1>
            <p className="text-sm text-gray-600">שגיאה בטעינת ההודעות</p>
          </div>
          <Button onClick={loadMessages} variant="outline" size="sm" className="border-gray-300">
            <RefreshCw className="h-4 w-4 ml-2" />
            נסה שוב
          </Button>
        </div>
        <Card className="dashboard-card bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">שגיאה בטעינת ההודעות</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <Button onClick={loadMessages} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 dashboard-minimal">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">הודעות</h1>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm text-gray-600">
            <span>{messages.filter(m => !m.is_read).length} חדשות מתוך {messages.length} סה"כ</span>
            {conversations.length > 0 && (
              <>
                <span className="hidden md:inline">•</span>
                <span>{conversations.length} שיחות</span>
              </>
            )}
          </div>
        </div>
        <Button onClick={loadMessages} variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-50 h-8 md:h-9">
          <RefreshCw className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
          <span className="hidden md:inline">רענן</span>
        </Button>
      </div>

      {/* Clean Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 border border-gray-200 w-full md:w-auto">
          <TabsTrigger value="messages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1 md:flex-none text-xs md:text-sm">
            הודעות
            {messages.filter(m => !m.is_read).length > 0 && (
              <Badge variant="secondary" className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 p-0 text-xs bg-blue-100 text-blue-700">
                {messages.filter(m => !m.is_read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1 md:flex-none text-xs md:text-sm">
            התראות
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Badge variant="secondary" className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 p-0 text-xs bg-amber-100 text-amber-700">
                {notifications.filter(n => !n.is_read).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 h-[500px] md:h-[550px] lg:h-[600px]">
            {/* Conversations List */}
            <Card className={`dashboard-card border-gray-200 shadow-sm ${selectedConversation ? 'hidden lg:block' : 'block'}`}>
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="p-1 md:p-1.5 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm md:text-base font-medium text-gray-900">שיחות</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 text-xs">
                    {filteredConversations.length}
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="חפש שיחות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 border-gray-300 focus:border-blue-500 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[480px] md:h-[380px] lg:h-[480px]">
                  {filteredConversations.length === 0 ? (
                    <div className="p-4 md:p-6 text-center">
                      <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-3">
                        <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                      </div>
                      <p className="text-xs md:text-sm text-gray-500">אין שיחות להצגה</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 p-1 md:p-2">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation)}
                          className={`p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedConversation?.id === conversation.id
                              ? 'bg-blue-50 border border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-gray-200 flex-shrink-0">
                              <AvatarImage src={conversation.participant.avatar} />
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs md:text-sm">
                                {conversation.participant.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-xs md:text-sm truncate ${
                                  conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                                }`}>
                                  {conversation.participant.name}
                                </h4>
                                <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
                                  {conversation.unreadCount > 0 && (
                                    <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-blue-600 rounded-full"></div>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatMessageDate(conversation.lastMessage.created_at)}
                                  </span>
                                </div>
                              </div>
                              <p className={`text-xs truncate ${
                                conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                              }`}>
                                {conversation.lastMessage.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages View */}
            <Card className={`lg:col-span-2 dashboard-card border-gray-200 shadow-sm ${!selectedConversation ? 'hidden lg:block' : 'block'}`}>
              {selectedConversation ? (
                <>
                  <CardHeader className="pb-2 md:pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="lg:hidden h-8 w-8 p-0 border-gray-300 ml-2"
                          onClick={() => setSelectedConversation(null)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </Button>
                        <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-gray-200">
                          <AvatarImage src={selectedConversation.participant.avatar} />
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs md:text-sm">
                            {selectedConversation.participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {selectedConversation.participant.name}
                          </h3>
                          <p className="text-xs text-gray-500 hidden md:block">
                            {selectedConversation.participant.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 border-gray-300">
                          <Archive className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 border-gray-300">
                          <MoreHorizontal className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[350px] md:h-[400px] p-2 md:p-4">
                      <div className="space-y-2 md:space-y-3">
                        {selectedConversation.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender_id === user.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] md:max-w-[75%] p-2 md:p-3 rounded-lg shadow-sm ${
                                message.sender_id === user.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="text-xs md:text-sm leading-relaxed">{message.content}</p>
                              <div className="flex items-center justify-between mt-1 md:mt-2">
                                <span className={`text-xs ${
                                  message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {format(new Date(message.created_at), 'HH:mm dd/MM')}
                                </span>
                                {message.sender_id === user.id && (
                                  <div className="flex items-center gap-1">
                                    {message.is_read ? (
                                      <CheckCircle className="h-3 w-3 text-blue-200" />
                                    ) : (
                                      <Clock className="h-3 w-3 text-blue-200" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="border-t border-gray-100 p-2 md:p-3">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="כתוב הודעה..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="min-h-[40px] md:min-h-[50px] resize-none border-gray-300 focus:border-blue-500 text-sm"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          size="sm"
                          className="self-end bg-blue-600 hover:bg-blue-700 h-[40px] md:h-[50px] px-3 md:px-4"
                        >
                          {sendingMessage ? (
                            <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                          ) : (
                            <Send className="h-3 w-3 md:h-4 md:w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="p-3 md:p-4 bg-gray-50 rounded-full w-fit mx-auto mb-3 md:mb-4">
                    <MessageSquare className="h-8 w-8 md:h-12 md:w-12 text-gray-400" />
                  </div>
                  <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2">בחר שיחה</h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    בחר שיחה מהרשימה כדי להתחיל לצפות בהודעות
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="dashboard-card border-gray-200 shadow-sm">
            <CardHeader className="pb-2 md:pb-3">
              <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                <div className="p-1 md:p-1.5 bg-amber-100 rounded-lg">
                  <Bell className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />
                </div>
                <CardTitle className="text-sm md:text-base font-medium text-gray-900">התראות מערכת</CardTitle>
              </div>
              <CardDescription className="text-xs md:text-sm text-gray-600">
                התראות והודעות מהמערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-6">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-3">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">אין התראות להצגה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        notification.is_read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                            )}
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {notification.subject || 'התראת מערכת'}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                            {notification.content}
                          </p>
                          <span className="text-xs text-gray-500">
                            {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="flex gap-1 ml-2 md:ml-3 flex-shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 border-gray-300"
                              title="סמן כנקרא"
                            >
                              <CheckCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMessage(notification.id)}
                            className="h-7 w-7 md:h-8 md:w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            title="מחק התראה"
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}