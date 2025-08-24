
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Vehicle } from "@/api/entities";
import { Search, Car, TrendingUp, Star, Crown, Truck, Bus, CarFront, Construction, Mail, Filter, Zap, Accessibility } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl, ROUTES } from "@/utils";
import VehicleCard from "../components/VehicleCard";
import AdvancedSearch from "../components/AdvancedSearch";
import BasicSearch from "../components/search/BasicSearch";
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';



// מטמון מפתחי מיון
const SORT_OPTIONS = {
  "-created_date": "החדשים ביותר",
  "price": "מחיר - נמוך לגבוה",
  "-price": "מחיר - גבוה לנמוך",
  "kilometers": "קילומטראז' - נמוך לגבוה",
  "-year": "שנת ייצור - חדש לישן"
};

const INITIAL_FILTERS = {
  category: "all",
  manufacturer: "all",
  location: "all",
  yearRange: [1990, 2025],
  priceRange: [0, 1500000],
  kilometersRange: [0, 1000000],
  handRange: [0, 10],
  model: "all",
  engineType: "all",
  transmission: "all",
  ownership: "all",
  engineVolume: [0, 10000],
};

const CATEGORIES = [
    { label: 'משאיות', value: 'משאית', icon: Truck },
    { label: 'אוטובוסים', value: 'אוטובוס', icon: Bus },
    { label: 'מיניבוסים', value: 'מיניבוס', icon: CarFront },
    { label: 'ציוד כבד', value: 'ציוד כבד', icon: Construction },
];

export default function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("-created_date");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isBasicSearchOpen, setIsBasicSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(INITIAL_FILTERS);
  const [basicSearchResults, setBasicSearchResults] = useState([]);
  const [isBasicSearchActive, setIsBasicSearchActive] = useState(false);
  const resultsRef = useRef(null);
  
  // Accessibility context for emergency button
  const accessibility = useAccessibility();
  const dispatch = useAccessibilityDispatch();
  



  useEffect(() => {
    document.title = "צומת - פלטפורמת הרכב הכבד בישראל";
    loadVehicles();
  }, []);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await Vehicle.list("-created_date", 100); // Fetch more for better filtering
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setVehicles([]);
    }
    setIsLoading(false);
  }, []);

  const sortedAndFilteredVehicles = useMemo(() => {
    // אם יש חיפוש בסיסי פעיל, השתמש בתוצאות שלו
    if (isBasicSearchActive && Array.isArray(basicSearchResults)) {
      return basicSearchResults;
    }
    
    if (!Array.isArray(vehicles) || vehicles.length === 0) return [];
    
    let filtered = vehicles.filter(vehicle => {
      if (vehicle.status !== "למכירה") return false;
      if (advancedFilters.category !== "all" && vehicle.type !== advancedFilters.category) return false;
      if (advancedFilters.manufacturer !== "all") {
        if (advancedFilters.manufacturer === 'חשמלי') {
          if (vehicle.manufacturer !== 'חשמלי' && vehicle.engine_type !== 'חשמלי') return false;
        } else {
          if (vehicle.manufacturer !== advancedFilters.manufacturer) return false;
        }
      }
      if (advancedFilters.location !== "all") {
        const regionCities = {
          'צפון': ["חיפה", "טבריה", "צפת", "קריות", "עכו", "נהריה", "כרמיאל", "עפולה", "קצרין", "נצרת", "קרית שמונה"],
          'מרכז': ["תל אביב", "ירושלים", "ראשון לציון", "פתח תקווה", "חולון", "בת ים", "רמת גן", "בני ברק", "נתניה", "הרצליה", "כפר סבא", "רעננה", "לוד", "רמלה", "רחובות", "מודיעין", "אריאל", "השרון", "השפלה", "גוש דן"],
          'דרום': ["באר שבע", "אשדוד", "אשקלון", "אילת", "דימונה", "נתיבות", "אופקים", "שדרות", "קרית גת", "קרית מלאכי", "ערד"]
        }[advancedFilters.location];
        if (regionCities && !regionCities.some(city => vehicle.location?.includes(city))) return false;
      }
      const year = parseInt(vehicle.year);
      if (year < advancedFilters.yearRange[0] || year > advancedFilters.yearRange[1]) return false;
      const price = parseInt(vehicle.price);
      if (price < advancedFilters.priceRange[0] || price > advancedFilters.priceRange[1]) return false;
      const kilometers = parseInt(vehicle.kilometers);
      if (kilometers < advancedFilters.kilometersRange[0] || kilometers > advancedFilters.kilometersRange[1]) return false;
      const hand = parseInt(vehicle.hand);
      if (vehicle.hand != null && (hand < advancedFilters.handRange[0] || hand > advancedFilters.handRange[1])) return false;
      return true;
    });

    // Custom sort logic
    filtered.sort((a, b) => {
        // Premium sorting
        const score = (v) => v.listing_type === 'פרימיום' ? 2 : v.listing_type === 'מודגש' ? 1 : 0;
        if (score(b) !== score(a)) return score(b) - score(a);

        // General sorting
        const [field, direction] = sortBy.startsWith('-') ? [sortBy.substring(1), 'desc'] : [sortBy, 'asc'];
        const valA = a[field];
        const valB = b[field];

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
  }, [vehicles, advancedFilters, sortBy, basicSearchResults, isBasicSearchActive]);


  const handleSortChange = useCallback((newSort) => setSortBy(newSort), []);
  const handleSearchToggle = useCallback(() => setIsAdvancedSearchOpen(prev => !prev), []);
  const handleBasicSearchToggle = useCallback(() => setIsBasicSearchOpen(prev => !prev), []);

  // פונקציות לסנכרון בין מנועי החיפוש
  const handleAdvancedFiltersChange = useCallback((newFilters) => {
    setAdvancedFilters(newFilters);
    // כאשר החיפוש המתקדם משתנה, נטרל את החיפוש הבסיסי
    setIsBasicSearchActive(false);
    setBasicSearchResults([]);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => handleAdvancedFiltersChange(newFilters), [handleAdvancedFiltersChange]);

  const handleBasicSearchResults = useCallback((results) => {
    setBasicSearchResults(results);
    // כאשר החיפוש הבסיסי פעיל, נטרל את החיפוש המתקדם
    if (results.length > 0 || isBasicSearchActive) {
      setIsAdvancedSearchOpen(false);
    }
  }, [isBasicSearchActive]);

  const handleBasicSearchState = useCallback((isActive) => {
    setIsBasicSearchActive(isActive);
    // אם החיפוש הבסיסי לא פעיל, נאפס את התוצאות
    if (!isActive) {
      setBasicSearchResults([]);
    }
  }, []);

  const handleBasicToAdvancedSync = useCallback((basicFiltersUpdate) => {
    // סנכרון מהחיפוש הבסיסי לחיפוש המתקדם
    const mergedFilters = {
      ...advancedFilters,
      ...basicFiltersUpdate
    };
    setAdvancedFilters(mergedFilters);
  }, [advancedFilters]);


  const handleCategoryClick = useCallback((category) => {
    setAdvancedFilters({ ...INITIAL_FILTERS, category });
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const renderVehicles = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse space-y-4">
              <div className="aspect-[4/3] bg-gray-200 rounded-xl"></div>
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (sortedAndFilteredVehicles.length === 0) {
      return (
        <div className="text-center py-16">
          <Car className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">לא נמצאו רכבים</h3>
          <p className="text-gray-500 mb-8">נסה לשנות את קריטריוני החיפוש או בדוק שוב בקרוב</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setAdvancedFilters(INITIAL_FILTERS)} variant="outline" className="px-8 py-3 rounded-xl text-lg font-semibold border-2 border-blue-800 text-blue-800 hover:bg-gradient-to-r from-blue-50 to-amber-50 transition-all duration-300">
              נקה את החיפוש
            </Button>
            <Link to={ROUTES.ADD_VEHICLE}>
              <Button className="px-8 py-3 rounded-xl text-lg font-semibold bg-blue-800 text-white hover-lift transition-all duration-300 hover:bg-blue-700">
                הוסף מודעה ראשונה
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sortedAndFilteredVehicles.map((vehicle, index) => (
          <div key={vehicle.id} className="fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <VehicleCard vehicle={vehicle} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-l from-blue-900 via-blue-800 to-indigo-900 text-white pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight corporate-branding">צומת</h1>
            <div className="text-xl md:text-2xl mb-8 text-blue-100 max-w-4xl mx-auto leading-relaxed text-right" dir="rtl">
              <p className="text-yellow-300 font-semibold mb-2">הפלטפורמה המקצועית והמובילה בישראל</p>
              <p>לרכישה ומכירה של רכבים מסחריים</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
                {CATEGORIES.map(({ label, value, icon: Icon }) => (
                    <button key={value} onClick={() => handleCategoryClick(value)} className="flex items-center gap-3 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/25 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm">
                        <Icon className="w-6 h-6 text-amber-300" />
                        <span className="font-semibold text-lg whitespace-nowrap">{label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* חיפוש מתקדם עם כפתור ומיון */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100/20 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-200" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-semibold text-white">חיפוש מתקדם</h3>
                    <p className="text-sm text-blue-100">חיפוש מפורט עם כל האפשרויות</p>
                  </div>
                </div>
                <Button
                  onClick={handleSearchToggle}
                  className={`px-6 py-3 h-12 rounded-xl font-semibold transition-all duration-300 ${
                    isAdvancedSearchOpen
                      ? 'bg-white text-blue-800 hover:bg-gradient-to-r from-blue-50 to-amber-50 shadow-lg'
                      : 'bg-white/20 hover:bg-white/30 text-white border-2 border-white/30'
                  }`}
                >
                  {isAdvancedSearchOpen ? 'סגור חיפוש מתקדם' : 'פתח חיפוש מתקדם'}
                </Button>
              </div>
              
              {/* שדה מיון */}
              <div className="flex justify-start" dir="rtl">
                <div className="w-full max-w-xs">
                  <label className="block text-sm font-medium text-blue-100 mb-2 text-right">מיון תוצאות</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="h-12 bg-white/20 text-white border-white/30 text-right [&>span]:text-right [&>span]:w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-right">
                      {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-right">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* חיפוש מתקדם מורחב */}
            <AdvancedSearch 
              isOpen={isAdvancedSearchOpen} 
              onClose={() => setIsAdvancedSearchOpen(false)} 
              onApplyFilters={handleFiltersChange} 
              initialFilters={advancedFilters} 
            />

            {/* חיפוש מהיר עם כפתור */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100/20 rounded-lg">
                    <Zap className="w-5 h-5 text-green-200" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-semibold text-white">חיפוש מהיר</h3>
                    <p className="text-sm text-blue-100">חיפוש פשוט ויעיל עם סינונים בסיסיים</p>
                  </div>
                </div>
                <Button
                  onClick={handleBasicSearchToggle}
                  className={`px-6 py-3 h-12 rounded-xl font-semibold transition-all duration-300 ${
                    isBasicSearchOpen
                      ? 'bg-white text-green-700 hover:bg-green-50 shadow-lg'
                      : 'bg-white/20 hover:bg-white/30 text-white border-2 border-white/30'
                  }`}
                >
                  {isBasicSearchOpen ? 'סגור חיפוש מהיר' : 'פתח חיפוש מהיר'}
                </Button>
              </div>
            </div>

            {/* חיפוש מהיר מורחב */}
            <BasicSearch
              isOpen={isBasicSearchOpen}
              onClose={() => setIsBasicSearchOpen(false)}
              vehicles={vehicles}
              onResultsChange={handleBasicSearchResults}
              onSearchStateChange={handleBasicSearchState}
              advancedFilters={advancedFilters}
              onFiltersSync={handleBasicToAdvancedSync}
            />
          </div>
        </div>
      </section>

      <section ref={resultsRef} className="py-16 bg-slate-50" data-results-section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-baseline gap-4">
                <h2 className="text-3xl font-bold text-gray-900">תוצאות החיפוש</h2>
                <span className="text-lg font-medium text-blue-600">
                  {isLoading ? "טוען..." : `מציג ${sortedAndFilteredVehicles.length} רכבים`}
                </span>
                {isBasicSearchActive && (
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    חיפוש מהיר
                  </span>
                )}
                {isAdvancedSearchOpen && (
                  <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    חיפוש מתקדם
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                מודעות פרימיום ומודגשות מופיעות ראשונות
                {isBasicSearchActive && " • תוצאות מהחיפוש המהיר"}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to={ROUTES.ADD_VEHICLE}>
                <Button className="bg-blue-800 text-white hover-lift shadow-lg px-6 py-3 text-base transition-all duration-300 hover:bg-blue-700">
                  <Crown className="w-5 h-5 ml-2" />
                  פרסם מודעה
                </Button>
              </Link>
            </div>
          </div>

          {renderVehicles()}
        </div>
      </section>

      {/* Emergency Accessibility Button - only show if floating button is missing */}
      {(!accessibility.floatingButton || accessibility.buttonPermanentlyClosed) && (
        <div className="fixed bottom-4 left-4 z-[9999]">
          <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-700 hover:bg-red-100 shadow-lg"
            onClick={() => {
              dispatch(accessibilityActions.setFloatingButton(true));
              dispatch(accessibilityActions.setButtonPermanentlyClosed(false));
              dispatch(accessibilityActions.setButtonClosed(false));
              dispatch(accessibilityActions.setButtonMinimized(false));
            }}
            aria-label="שחזר כפתור נגישות"
            title="שחזר כפתור נגישות (חירום)"
          >
            <Accessibility className="w-4 h-4 ml-1" />
            שחזר נגישות
          </Button>
        </div>
      )}
    </div>
  );
}
