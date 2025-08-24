import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Filter, MapPin, Car, Calendar, DollarSign, Gauge, Zap, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * BasicSearch - חיפוש רגיל עם סינונים בסיסיים
 */
export const BasicSearch = ({ isOpen, onClose, vehicles, onResultsChange, onSearchStateChange, advancedFilters, onFiltersSync }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [basicFilters, setBasicFilters] = useState({
    category: "all",
    manufacturer: "all",
    location: "all",
    maxPrice: "all",
    maxYear: "all"
  });

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // אופציות בסיסיות
  const categories = [
    'משאית', 'אוטובוס', 'מיניבוס', 'ציוד כבד', 'מנוף', 'טרקטור'
  ];

  const manufacturers = [
    'מרצדס', 'מאן', 'דאף', 'וולבו', 'איווקו', 'סקניה', 'רנו'
  ];

  const locations = [
    'צפון', 'מרכז', 'דרום'
  ];

  const priceRanges = [
    { label: 'עד 100K', value: 100000 },
    { label: 'עד 200K', value: 200000 },
    { label: 'עד 500K', value: 500000 },
    { label: 'עד 1M', value: 1000000 }
  ];

  const yearRanges = [
    { label: 'מ-2020', value: 2020 },
    { label: 'מ-2015', value: 2015 },
    { label: 'מ-2010', value: 2010 },
    { label: 'מ-2005', value: 2005 }
  ];

  // סנכרון עם החיפוש המתקדם
  useEffect(() => {
    if (advancedFilters) {
      const syncedFilters = {
        category: advancedFilters.category || "all",
        manufacturer: advancedFilters.manufacturer || "all",
        location: advancedFilters.location || "all",
        maxPrice: advancedFilters.priceRange?.[1] === 1500000 ? "all" : 
                  advancedFilters.priceRange?.[1] <= 100000 ? 100000 :
                  advancedFilters.priceRange?.[1] <= 200000 ? 200000 :
                  advancedFilters.priceRange?.[1] <= 500000 ? 500000 :
                  advancedFilters.priceRange?.[1] <= 1000000 ? 1000000 : "all",
        maxYear: advancedFilters.yearRange?.[0] === 1990 ? "all" :
                 advancedFilters.yearRange?.[0] >= 2020 ? 2020 :
                 advancedFilters.yearRange?.[0] >= 2015 ? 2015 :
                 advancedFilters.yearRange?.[0] >= 2010 ? 2010 :
                 advancedFilters.yearRange?.[0] >= 2005 ? 2005 : "all"
      };
      setBasicFilters(syncedFilters);
    }
  }, [advancedFilters]);

  // פונקציית חיפוש מתקדמת
  const performSearch = useMemo(() => {
    return (query, filters) => {
      let results = vehicles;

      // סינון לפי טקסט חיפוש
      if (query && query.length >= 1) {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        
        results = results.filter(vehicle => {
          if (vehicle.status !== 'למכירה') return false;
          
          const searchableText = [
            vehicle.title,
            vehicle.manufacturer,
            vehicle.model,
            vehicle.type,
            vehicle.location,
            vehicle.description
          ].filter(Boolean).join(' ').toLowerCase();

          // חישוב ציון חיפוש
          let score = 0;
          searchTerms.forEach(term => {
            if (vehicle.manufacturer?.toLowerCase().includes(term)) score += 10;
            if (vehicle.model?.toLowerCase().includes(term)) score += 8;
            if (vehicle.type?.toLowerCase().includes(term)) score += 6;
            if (vehicle.title?.toLowerCase().includes(term)) score += 5;
            if (searchableText.includes(term)) score += 2;
          });

          vehicle._searchScore = score;
          return score > 0;
        });
      } else {
        results = results.filter(vehicle => vehicle.status === 'למכירה');
      }

      // סינון לפי פילטרים בסיסיים
      results = results.filter(vehicle => {
        if (filters.category !== "all" && vehicle.type !== filters.category) return false;
        if (filters.manufacturer !== "all" && vehicle.manufacturer !== filters.manufacturer) return false;
        if (filters.location !== "all") {
          const regionCities = {
            'צפון': ["חיפה", "טבריה", "צפת", "קריות", "עכו", "נהריה", "כרמיאל", "עפולה", "קצרין", "נצרת", "קרית שמונה"],
            'מרכז': ["תל אביב", "ירושלים", "ראשון לציון", "פתח תקווה", "חולון", "בת ים", "רמת גן", "בני ברק", "נתניה", "הרצליה", "כפר סבא", "רעננה", "לוד", "רמלה", "רחובות", "מודיעין", "אריאל", "השרון", "השפלה", "גוש דן"],
            'דרום': ["באר שבע", "אשדוד", "אשקלון", "אילת", "דימונה", "נתיבות", "אופקים", "שדרות", "קרית גת", "קרית מלאכי", "ערד"]
          }[filters.location];
          if (regionCities && !regionCities.some(city => vehicle.location?.includes(city))) return false;
        }
        if (filters.maxPrice !== "all" && vehicle.price > filters.maxPrice) return false;
        if (filters.maxYear !== "all" && vehicle.year < filters.maxYear) return false;
        return true;
      });

      // מיון
      return results.sort((a, b) => {
        // מיון לפי סוג מודעה
        const scoreA = a.listing_type === 'פרימיום' ? 3 : (a.listing_type === 'מודגש' ? 2 : 1);
        const scoreB = b.listing_type === 'פרימיום' ? 3 : (b.listing_type === 'מודגש' ? 2 : 1);
        
        if (scoreB !== scoreA) return scoreB - scoreA;
        
        // מיון לפי ציון חיפוש אם יש
        if (a._searchScore && b._searchScore && b._searchScore !== a._searchScore) {
          return b._searchScore - a._searchScore;
        }
        
        return new Date(b.created_at) - new Date(a.created_at);
      }).slice(0, 50);
    };
  }, [vehicles]);

  // טיפול בשינוי טקסט החיפוש
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearchAndUpdate(query, basicFilters);
    }, 200);
  }, [basicFilters, performSearch]);

  // טיפול בשינוי פילטרים
  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...basicFilters, [key]: value };
    setBasicFilters(newFilters);
    performSearchAndUpdate(searchQuery, newFilters);
    
    // סנכרון עם החיפוש המתקדם
    syncWithAdvancedSearch(newFilters);
  }, [basicFilters, searchQuery]);

  // ביצוע חיפוש ועדכון תוצאות
  const performSearchAndUpdate = useCallback((query, filters) => {
    setIsSearching(true);
    const results = performSearch(query, filters);
    setSearchResults(results);
    onResultsChange(results);
    onSearchStateChange(results.length > 0 || query.length > 0 || hasActiveFilters(filters));
    setIsSearching(false);
  }, [performSearch, onResultsChange, onSearchStateChange]);

  // בדיקה אם יש פילטרים פעילים
  const hasActiveFilters = useCallback((filters) => {
    return Object.values(filters).some(value => value !== "all");
  }, []);

  // סנכרון עם החיפוש המתקדם
  const syncWithAdvancedSearch = useCallback((filters) => {
    if (onFiltersSync) {
      const advancedFiltersUpdate = {
        category: filters.category,
        manufacturer: filters.manufacturer,
        location: filters.location,
        priceRange: filters.maxPrice === "all" ? [0, 1500000] : [0, filters.maxPrice],
        yearRange: filters.maxYear === "all" ? [1990, new Date().getFullYear()] : [filters.maxYear, new Date().getFullYear()]
      };
      onFiltersSync(advancedFiltersUpdate);
    }
  }, [onFiltersSync]);

  // ניקוי חיפוש
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setBasicFilters({
      category: "all",
      manufacturer: "all",
      location: "all",
      maxPrice: "all",
      maxYear: "all"
    });
    setSearchResults([]);
    onResultsChange([]);
    onSearchStateChange(false);
    searchInputRef.current?.focus();
  }, [onResultsChange, onSearchStateChange]);

  // ספירת פילטרים פעילים
  const activeFiltersCount = useMemo(() => {
    return Object.values(basicFilters).filter(value => value !== "all").length;
  }, [basicFilters]);

  // אם לא פתוח, לא מציג כלום
  if (!isOpen) return null;

  return (
    <Card className="bg-white/95 backdrop-blur-md shadow-lg border-0 rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        {/* כותרת */}
        <div className="flex items-center justify-between mb-6" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-semibold text-gray-800">חיפוש מהיר</h3>
              <p className="text-sm text-gray-600">חיפוש פשוט ויעיל עם סינונים בסיסיים</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
            <ChevronUp className="h-4 w-4" />
          </Button>
          {(searchResults.length > 0 || activeFiltersCount > 0) && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white">
                {searchResults.length} תוצאות
              </Badge>
              {activeFiltersCount > 0 && (
                <Badge className="bg-gradient-to-r from-blue-50 to-amber-500 text-white">
                  {activeFiltersCount} סינונים
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* שדה חיפוש ראשי */}
        <div className="relative mb-6" dir="rtl">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="חפש רכב לפי יצרן, דגם, מיקום או מילות מפתח..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full h-12 pr-12 pl-12 text-lg bg-white text-gray-800 placeholder-gray-500 border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 rounded-xl shadow-sm transition-all duration-300 text-right"
            dir="rtl"
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-red-100 rounded-full"
            >
              <X className="w-4 h-4 text-red-500" />
            </Button>
          )}
          {isSearching && (
            <div className="absolute left-12 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            </div>
          )}
        </div>

        {/* סינונים בסיסיים */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" dir="rtl">
          {/* קטגוריה */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 justify-end text-right">
              <span>קטגוריה</span>
              <Car className="w-3 h-3" />
            </label>
            <Select value={basicFilters.category} onValueChange={(v) => handleFilterChange('category', v)}>
              <SelectTrigger className="h-10 text-sm text-right">
                <SelectValue placeholder="הכל" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="text-right">{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* יצרן */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 justify-end text-right">
              <span>יצרן</span>
              <Filter className="w-3 h-3" />
            </label>
            <Select value={basicFilters.manufacturer} onValueChange={(v) => handleFilterChange('manufacturer', v)}>
              <SelectTrigger className="h-10 text-sm text-right">
                <SelectValue placeholder="הכל" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {manufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer} className="text-right">{manufacturer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* מיקום */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 justify-end text-right">
              <span>אזור</span>
              <MapPin className="w-3 h-3" />
            </label>
            <Select value={basicFilters.location} onValueChange={(v) => handleFilterChange('location', v)}>
              <SelectTrigger className="h-10 text-sm text-right">
                <SelectValue placeholder="כל הארץ" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">כל הארץ</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location} value={location} className="text-right">{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* מחיר מקסימלי */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 justify-end text-right">
              <span>מחיר עד</span>
              <DollarSign className="w-3 h-3" />
            </label>
            <Select value={basicFilters.maxPrice} onValueChange={(v) => handleFilterChange('maxPrice', v)}>
              <SelectTrigger className="h-10 text-sm text-right">
                <SelectValue placeholder="ללא הגבלה" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">ללא הגבלה</SelectItem>
                {priceRanges.map(range => (
                  <SelectItem key={range.value} value={range.value} className="text-right">{range.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* שנה מינימלית */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 justify-end text-right">
              <span>שנה מ</span>
              <Calendar className="w-3 h-3" />
            </label>
            <Select value={basicFilters.maxYear} onValueChange={(v) => handleFilterChange('maxYear', v)}>
              <SelectTrigger className="h-10 text-sm text-right">
                <SelectValue placeholder="הכל" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {yearRanges.map(range => (
                  <SelectItem key={range.value} value={range.value} className="text-right">{range.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* כפתור ניקוי */}
        {(searchQuery || activeFiltersCount > 0) && (
          <div className="flex justify-center mt-6" dir="rtl">
            <Button
              variant="outline"
              onClick={clearSearch}
              className="px-6 py-2 text-sm border-2 hover:bg-gray-50"
            >
              <X className="w-4 h-4 ml-2" />
              נקה חיפוש ({searchResults.length} תוצאות)
            </Button>
          </div>
        )}

        {/* הודעות */}
        {searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg text-center" dir="rtl">
            <p className="text-orange-700 text-sm text-right">
              🔍 לא נמצאו תוצאות עבור "<strong>{searchQuery}</strong>"
            </p>
            <p className="text-orange-600 text-xs mt-1 text-right">
              נסה מילות מפתח אחרות או שנה את הסינונים
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicSearch;