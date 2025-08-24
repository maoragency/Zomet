import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminGuard from '@/components/auth/AdminGuard';

// Lazy load pages for code splitting
const Home = lazy(() => import("./Home"));
const AddVehicle = lazy(() => import("./AddVehicle"));
const VehicleDetails = lazy(() => import("./VehicleDetails"));
const Pricing = lazy(() => import("./Pricing"));
const BuyerRequest = lazy(() => import("./BuyerRequest"));
const FinancingAndInsurance = lazy(() => import("./FinancingAndInsurance"));
const Financing = lazy(() => import("./Financing"));
const Insurance = lazy(() => import("./Insurance"));
const MyListings = lazy(() => import("./MyListings"));
const VehiclePricing = lazy(() => import("./VehiclePricing"));
const Checkout = lazy(() => import("./Checkout"));
const PaymentSuccess = lazy(() => import("./PaymentSuccess"));
const Contact = lazy(() => import("./Contact"));

// Authentication pages
const Login = lazy(() => import("./auth/Login"));
const Signup = lazy(() => import("./auth/Signup"));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./auth/ResetPassword"));

// Dashboard pages
const DashboardLayout = lazy(() => import("./dashboard/user/DashboardLayout"));
const DashboardHome = lazy(() => import("./dashboard/user/DashboardHome"));
const ProfilePage = lazy(() => import("./dashboard/user/ProfilePage"));
const AnalyticsPage = lazy(() => import("./dashboard/user/AnalyticsPage"));
const AdManagementPage = lazy(() => import("./dashboard/user/AdManagementPage"));
const MessagingPage = lazy(() => import("./dashboard/user/MessagingPage"));

// Admin Dashboard pages
const AdminDashboardLayout = lazy(() => import("./dashboard/admin/AdminDashboardLayout"));
const AdminHomePage = lazy(() => import("./dashboard/admin/AdminHomePage"));
const UserManagementPage = lazy(() => import("./dashboard/admin/UserManagementPage"));
const AdminVehicleManagementPage = lazy(() => import("./dashboard/admin/AdminVehicleManagementPage"));
const AdminAnalyticsPage = lazy(() => import("./dashboard/admin/AdminAnalyticsPage"));
const AuditLogsPage = lazy(() => import("./dashboard/admin/AuditLogsPage"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">טוען...</span>
  </div>
);

const PAGES = {
    Home: Home,
    AddVehicle: AddVehicle,
    VehicleDetails: VehicleDetails,
    Pricing: Pricing,
    BuyerRequest: BuyerRequest,
    FinancingAndInsurance: FinancingAndInsurance,
    Financing: Financing,
    Insurance: Insurance,
    MyListings: MyListings,
    VehiclePricing: VehiclePricing,
    Checkout: Checkout,
    PaymentSuccess: PaymentSuccess,
    Contact: Contact,
    Login: Login,
    Signup: Signup,
    ForgotPassword: ForgotPassword,
    ResetPassword: ResetPassword,
    DashboardLayout: DashboardLayout,
    DashboardHome: DashboardHome,
    ProfilePage: ProfilePage,
    AdManagementPage: AdManagementPage,
    MessagingPage: MessagingPage,
    AdminDashboardLayout: AdminDashboardLayout,
    AdminHomePage: AdminHomePage,
    UserManagementPage: UserManagementPage,
    AdminVehicleManagementPage: AdminVehicleManagementPage,
    AdminAnalyticsPage: AdminAnalyticsPage,
    AuditLogsPage: AuditLogsPage
}

function _getCurrentPage(url) {
    // Normalize URL
    if (url.endsWith('/') && url !== '/') {
        url = url.slice(0, -1);
    }
    
    // Remove query parameters
    const cleanUrl = url.split('?')[0];
    
    // Handle root path
    if (cleanUrl === '' || cleanUrl === '/') {
        return 'Home';
    }
    
    // Handle dashboard routes
    if (cleanUrl.startsWith('/dashboard')) {
        return 'DashboardLayout';
    }
    
    // Handle admin routes
    if (cleanUrl.startsWith('/admin')) {
        return 'AdminDashboardLayout';
    }
    
    // Extract page name from URL
    const urlParts = cleanUrl.split('/').filter(Boolean);
    const lastPart = urlParts[urlParts.length - 1];
    
    // Convert URL segment to page name (e.g., 'addvehicle' -> 'AddVehicle')
    const pageName = lastPart
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    
    // Check if page exists
    const foundPage = Object.keys(PAGES).find(page => 
        page.toLowerCase() === pageName.toLowerCase()
    );
    
    return foundPage || 'Home'; // Fallback to Home if page not found
}

// LayoutWrapper שמחשב currentPage בזמן אמת
function LayoutWrapper({ children }) {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    console.log('🎯 LayoutWrapper render:', {
        pathname: location.pathname,
        currentPage,
        timestamp: new Date().toISOString()
    });
    
    return (
        <Layout currentPageName={currentPage}>
            {children}
        </Layout>
    );
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Dashboard routes */}
                <Route path="/dashboard/*" element={
                    <AuthGuard>
                        <DashboardLayout />
                    </AuthGuard>
                }>
                    <Route index element={<DashboardHome />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="ads" element={<AdManagementPage />} />
                    <Route path="messages" element={<MessagingPage />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin/*" element={
                    <AdminGuard>
                        <AdminDashboardLayout />
                    </AdminGuard>
                }>
                    <Route index element={<AdminHomePage />} />
                    <Route path="dashboard" element={<AdminHomePage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="vehicles" element={<AdminVehicleManagementPage />} />
                    <Route path="analytics" element={<AdminAnalyticsPage />} />
                    <Route path="audit" element={<AuditLogsPage />} />
                </Route>

                {/* Main application routes */}
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/Home" element={<Home />} />
                
                {/* Vehicle routes */}
                <Route path="/addvehicle" element={<AddVehicle />} />
                <Route path="/AddVehicle" element={<AddVehicle />} />
                <Route path="/vehicledetails" element={<VehicleDetails />} />
                <Route path="/VehicleDetails" element={<VehicleDetails />} />
                <Route path="/mylistings" element={<MyListings />} />
                <Route path="/MyListings" element={<MyListings />} />
                <Route path="/vehiclepricing" element={<VehiclePricing />} />
                <Route path="/VehiclePricing" element={<VehiclePricing />} />
                
                {/* Service routes */}
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/Pricing" element={<Pricing />} />
                <Route path="/buyerrequest" element={<BuyerRequest />} />
                <Route path="/BuyerRequest" element={<BuyerRequest />} />
                <Route path="/financingandinsurance" element={<FinancingAndInsurance />} />
                <Route path="/FinancingAndInsurance" element={<FinancingAndInsurance />} />
                <Route path="/financing" element={<Financing />} />
                <Route path="/Financing" element={<Financing />} />
                <Route path="/insurance" element={<Insurance />} />
                <Route path="/Insurance" element={<Insurance />} />
                
                {/* Transaction routes */}
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/Checkout" element={<Checkout />} />
                <Route path="/paymentsuccess" element={<PaymentSuccess />} />
                <Route path="/PaymentSuccess" element={<PaymentSuccess />} />
                
                {/* Contact route */}
                <Route path="/contact" element={<Contact />} />
                <Route path="/Contact" element={<Contact />} />
                
                {/* Authentication routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/Login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/Signup" element={<Signup />} />
                <Route path="/forgotpassword" element={<ForgotPassword />} />
                <Route path="/ForgotPassword" element={<ForgotPassword />} />
                <Route path="/resetpassword" element={<ResetPassword />} />
                <Route path="/ResetPassword" element={<ResetPassword />} />
                
                {/* Catch-all route for 404 */}
                <Route path="*" element={<Home />} />
            </Routes>
        </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}