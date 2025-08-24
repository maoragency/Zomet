import React, { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw,
  ChevronUp,
  ChevronDown
} from "lucide-react";

const AdvancedSearch = memo(({ isOpen, onClose, onApplyFilters, initialFilters }) => {
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState([]);

  const currentYear = new Date().getFullYear();

  // אופציות בסגנון יד2
  const categories = [
    'משאית', 'אוטובוס', 'מיניבוס', 'ציוד כבד', 'מנוף', 'טרקטור', 
    'מלגזה', 'נגרר', 'רכב עבודה', 'טנדר', 'אחר'
  ];

  const manufacturers = [
    'מרצדס', 'מאן', 'דאף', 'וולבו', 'איווקו', 'BMC', 'יוטונג', 
    'סקניה', 'רנו', 'פיאט', 'איסוזו', 'מיצובישי', 'ניסאן'
  ];

  const locations = [
    'צפון', 'מרכז', 'דרום', 'ירושלים והסביבה', 'שפלה', 'שרון'
  ];

  // אופציות נוספות
  const engineTypes = [
    'בנזין', 'דיזל', 'גפ"מ', 'היברידי בנזין', 'היברידי דיזל', 
    'פלאג-אין בנזין', 'פלאג-אין דיזל', 'חשמלי בנזין', 'חשמלי'
  ];

  const transmissionTypes = [
    'אוטומטי', 'ידני'
  ];

  const ownershipTypes = [
    'פרטית', 'חברה', 'השכרה', 'ליסינג', 'מונית', 'לימוד נהיגה', 
    'ייבוא אישי', 'ייבוא מקביל', 'ממשלתי', 'או"ם', 'השכרה / החכר'
  ];

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      updateActiveFilters(initialFilters);
    }
  }, [initialFilters, isOpen]);

  const updateActiveFilters = useCallback((currentFilters) => {
    const active = [];
    
    if (currentFilters.category && currentFilters.category !== "all") {
      active.push({ key: 'category', label: currentFilters.category, value: currentFilters.category });
    }
    
    if (currentFilters.manufacturer && currentFilters.manufacturer !== "all") {
      active.push({ key: 'manufacturer', label: currentFilters.manufacturer, value: currentFilters.manufacturer });
    }
    
    if (currentFilters.location && currentFilters.location !== "all") {
      active.push({ key: 'location', label: currentFilters.location, value: currentFilters.location });
    }
    
    if (currentFilters.yearRange && (currentFilters.yearRange[0] > 1990 || currentFilters.yearRange[1] < currentYear)) {
      active.push({ 
        key: 'yearRange', 
        label: `${currentFilters.yearRange[0]}-${currentFilters.yearRange[1]}`, 
        value: currentFilters.yearRange 
      });
    }
    
    if (currentFilters.priceRange && (currentFilters.priceRange[0] > 0 || currentFilters.priceRange[1] < 1500000)) {
      active.push({ 
        key: 'priceRange', 
        label: `₪${formatPrice(currentFilters.priceRange[0])}-${formatPrice(currentFilters.priceRange[1])}`, 
        value: currentFilters.priceRange 
      });
    }
    
    if (currentFilters.kilometersRange && (currentFilters.kilometersRange[0] > 0 || currentFilters.kilometersRange[1] < 1000000)) {
      active.push({ 
        key: 'kilometersRange', 
        label: `${formatKilometers(currentFilters.kilometersRange[0])}-${formatKilometers(currentFilters.kilometersRange[1])} ק"מ`, 
        value: currentFilters.kilometersRange 
      });
    }

    if (currentFilters.model && currentFilters.model !== "all") {
      active.push({ key: 'model', label: `דגם: ${currentFilters.model}`, value: currentFilters.model });
    }

    if (currentFilters.engineType && currentFilters.engineType !== "all") {
      active.push({ key: 'engineType', label: `מנוע: ${currentFilters.engineType}`, value: currentFilters.engineType });
    }

    if (currentFilters.transmission && currentFilters.transmission !== "all") {
      active.push({ key: 'transmission', label: `תיבת הילוכים: ${currentFilters.transmission}`, value: currentFilters.transmission });
    }

    if (currentFilters.ownership && currentFilters.ownership !== "all") {
      active.push({ key: 'ownership', label: `בעלות: ${currentFilters.ownership}`, value: currentFilters.ownership });
    }

    if (currentFilters.engineVolume && (currentFilters.engineVolume[0] > 0 || currentFilters.engineVolume[1] < 10000)) {
      active.push({ 
        key: 'engineVolume', 
        label: `נפח מנוע: ${currentFilters.engineVolume[0]}-${currentFilters.engineVolume[1]} סמ"ק`, 
        value: currentFilters.engineVolume 
      });
    }
    
    setActiveFilters(active);
  }, [currentYear]);

  const formatPrice = useCallback((value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }, []);

  const formatKilometers = useCallback((value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }, []);

  // פונקציות עזר לסרגלי ההזזה
  const formatPriceDisplay = useCallback((value) => {
    if (value === 0) return "ללא מינימום";
    if (value >= 1500000) return "ללא מקסימום";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ₪`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K ₪`;
    return `${value.toLocaleString()} ₪`;
  }, []);

  const formatKilometersDisplay = useCallback((value) => {
    if (value === 0) return "ללא מינימום";
    if (value >= 1000000) return "ללא מקסימום";
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K ק"מ`;
    return `${value.toLocaleString()} ק"מ`;
  }, []);

  const formatYearDisplay = useCallback((value) => {
    if (value === 1990) return "מ-1990";
    if (value === currentYear) return `עד ${currentYear}`;
    return value.toString();
  }, [currentYear]);

  const formatEngineVolumeDisplay = useCallback((value) => {
    if (value === 0) return "ללא מינימום";
    if (value >= 10000) return "ללא מקסימום";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}L`;
    return `${value} סמ"ק`;
  }, []);

  const handleApply = useCallback(() => {
    updateActiveFilters(filters);
    onApplyFilters(filters);
    onClose();
  }, [filters, onApplyFilters, onClose, updateActiveFilters]);
  
  const handleReset = useCallback(() => {
    const resetFilters = {
      category: "all",
      manufacturer: "all", 
      location: "all",
      yearRange: [1990, currentYear],
      priceRange: [0, 1500000],
      kilometersRange: [0, 1000000],
      handRange: [0, 10],
      model: "all",
      engineType: "all",
      transmission: "all",
      ownership: "all",
      engineVolume: [0, 10000],
    };
    setFilters(resetFilters);
    setActiveFilters([]);
    onApplyFilters(resetFilters);
  }, [onApplyFilters, currentYear]);

  const removeFilter = useCallback((filterKey) => {
    const newFilters = { ...filters };
    
    switch (filterKey) {
      case 'category':
        newFilters.category = "all";
        break;
      case 'manufacturer':
        newFilters.manufacturer = "all";
        break;
      case 'location':
        newFilters.location = "all";
        break;
      case 'yearRange':
        newFilters.yearRange = [1990, currentYear];
        break;
      case 'priceRange':
        newFilters.priceRange = [0, 1500000];
        break;
      case 'kilometersRange':
        newFilters.kilometersRange = [0, 1000000];
        break;
      case 'handRange':
        newFilters.handRange = [0, 10];
        break;
      case 'model':
        newFilters.model = "all";
        break;
      case 'engineType':
        newFilters.engineType = "all";
        break;
      case 'transmission':
        newFilters.transmission = "all";
        break;
      case 'ownership':
        newFilters.ownership = "all";
        break;
      case 'engineVolume':
        newFilters.engineVolume = [0, 10000];
        break;
    }
    
    setFilters(newFilters);
    updateActiveFilters(newFilters);
  }, [filters, updateActiveFilters, currentYear]);

  const handleSelectChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRangeChange = useCallback((key, index, value) => {
    const newRange = [...filters[key]];
    newRange[index] = value === "" ? (index === 0 ? (key === 'yearRange' ? 1990 : 0) : (key === 'yearRange' ? currentYear : key === 'priceRange' ? 1500000 : key === 'kilometersRange' ? 1000000 : 10)) : Number(value);
    setFilters(prev => ({ ...prev, [key]: newRange }));
  }, [filters, currentYear]);

  // פונקציות לטיפול בסרגלי ההזזה
  const handleSliderChange = useCallback((key, values) => {
    setFilters(prev => ({ ...prev, [key]: values }));
  }, []);

  // אם לא פתוח, לא מציג כלום
  if (!isOpen) return null;

  return (
    <Card className="bg-white/95 backdrop-blur-md shadow-xl border-0 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <CardContent className="p-6">
        {/* כותרת */}
        <div className="flex items-center justify-between mb-6" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-semibold text-gray-800">חיפוש מתקדם</h3>
              <p className="text-sm text-gray-600">מצא בדיוק מה שאתה מחפש</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {/* מסננים פעילים */}
        {activeFilters.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-amber-50 p-4 rounded-xl mb-6" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-800 text-right">מסננים פעילים:</span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-6 px-2 text-blue-600 hover:bg-blue-100">
                <RotateCcw className="h-3 w-3 mr-1" />
                נקה הכל
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1 bg-white text-blue-700 border border-blue-200 text-xs hover:bg-gradient-to-r from-blue-50 to-amber-50"
                >
                  {filter.label}
                  <button 
                    onClick={() => removeFilter(filter.key)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* שדות החיפוש */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" dir="rtl">
          {/* קטגוריה */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">קטגוריה</Label>
            <Select value={filters.category} onValueChange={(v) => handleSelectChange('category', v)}>
              <SelectTrigger className="h-11 text-right">
                <SelectValue placeholder="בחר קטגוריה" />
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
            <Label className="text-sm font-medium text-gray-700 text-right">יצרן</Label>
            <Select value={filters.manufacturer} onValueChange={(v) => handleSelectChange('manufacturer', v)}>
              <SelectTrigger className="h-11 text-right">
                <SelectValue placeholder="בחר יצרן" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {manufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer} className="text-right">{manufacturer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* אזור */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">אזור</Label>
            <Select value={filters.location || 'all'} onValueChange={(v) => handleSelectChange('location', v)}>
              <SelectTrigger className="h-11 text-right">
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

          {/* שנה */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 text-right">שנת ייצור</Label>
            <div className="px-3">
              <Slider
                value={filters.yearRange}
                onValueChange={(values) => handleSliderChange('yearRange', values)}
                min={1990}
                max={currentYear}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatYearDisplay(filters.yearRange[0])}</span>
                <span>{formatYearDisplay(filters.yearRange[1])}</span>
              </div>
            </div>
          </div>

          {/* מחיר */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 text-right">מחיר</Label>
            <div className="px-3">
              <Slider
                value={filters.priceRange}
                onValueChange={(values) => handleSliderChange('priceRange', values)}
                min={0}
                max={1500000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatPriceDisplay(filters.priceRange[0])}</span>
                <span>{formatPriceDisplay(filters.priceRange[1])}</span>
              </div>
            </div>
          </div>

          {/* קילומטראז' */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 text-right">קילומטראז'</Label>
            <div className="px-3">
              <Slider
                value={filters.kilometersRange}
                onValueChange={(values) => handleSliderChange('kilometersRange', values)}
                min={0}
                max={1000000}
                step={5000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatKilometersDisplay(filters.kilometersRange[0])}</span>
                <span>{formatKilometersDisplay(filters.kilometersRange[1])}</span>
              </div>
            </div>
          </div>

          {/* דגם */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">דגם</Label>
            <Input
              placeholder="הכנס דגם..."
              value={filters.model === "all" ? "" : filters.model}
              onChange={(e) => handleSelectChange('model', e.target.value || "all")}
              className="h-11 text-right"
              dir="rtl"
            />
          </div>

          {/* סוג מנוע */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">סוג מנוע</Label>
            <Select value={filters.engineType || 'all'} onValueChange={(v) => handleSelectChange('engineType', v)}>
              <SelectTrigger className="h-11 text-right">
                <SelectValue placeholder="בחר סוג מנוע" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {engineTypes.map(type => (
                  <SelectItem key={type} value={type} className="text-right">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* תיבת הילוכים */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">תיבת הילוכים</Label>
            <Select value={filters.transmission || 'all'} onValueChange={(v) => handleSelectChange('transmission', v)}>
              <SelectTrigger className="h-11 text-right">
                <SelectValue placeholder="בחר תיבת הילוכים" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {transmissionTypes.map(type => (
                  <SelectItem key={type} value={type} className="text-right">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* בעלות */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 text-right">בעלות</Label>
            <Select value={filters.ownership || 'all'} onValueChange={(v) => handleSelectChange('ownership', v)}>
              <SelectTrigger className="h-11 text-right">
                <SelectValue placeholder="בחר סוג בעלות" />
              </SelectTrigger>
              <SelectContent className="text-right">
                <SelectItem value="all" className="text-right">הכל</SelectItem>
                {ownershipTypes.map(type => (
                  <SelectItem key={type} value={type} className="text-right">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* נפח מנוע */}
          <div className="space-y-3 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700 text-right">נפח מנוע (סמ"ק)</Label>
            <div className="px-3">
              <Slider
                value={filters.engineVolume || [0, 10000]}
                onValueChange={(values) => handleSliderChange('engineVolume', values)}
                min={0}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatEngineVolumeDisplay(filters.engineVolume?.[0] || 0)}</span>
                <span>{formatEngineVolumeDisplay(filters.engineVolume?.[1] || 10000)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex gap-3 mt-8 justify-center" dir="rtl">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="px-8 py-3 h-12 border-2 hover:bg-gray-50"
            disabled={activeFilters.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            נקה הכל
          </Button>
          <Button 
            onClick={handleApply} 
            className="px-8 py-3 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Search className="h-4 w-4 mr-2" />
            חפש רכבים ({activeFilters.length > 0 ? `${activeFilters.length} מסננים` : 'הכל'})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

AdvancedSearch.displayName = 'AdvancedSearch';

export default AdvancedSearch;