# Zomet - Advanced Vehicle Marketplace Platform

פלטפורמת מכירת רכבים מתקדמת עם תכונות זמן אמת, בנויה עם React, Supabase ו-Tailwind CSS.

## 🚀 תכונות עיקריות

- **חיפוש מתקדם** - מערכת חיפוש וסינון מתקדמת לרכבים
- **ניהול משתמשים** - מערכת אימות ואוטוריזציה מלאה
- **דשבורד אדמין** - ממשק ניהול מקיף למנהלי המערכת
- **דשבורד משתמש** - ממשק אישי לניהול רכבים ובקשות
- **תמיכה בנגישות** - תמיכה מלאה בנגישות ו-RTL
- **עיצוב רספונסיבי** - מותאם לכל הגדלי מסך
- **תכונות זמן אמת** - עדכונים בזמן אמת עם Supabase

## 🛠️ טכנולוגיות

### Frontend
- **React 18** - ספריית UI מודרנית
- **React Router DOM 7** - ניתוב מתקדם
- **Tailwind CSS** - עיצוב utility-first
- **Radix UI** - רכיבי UI נגישים
- **Framer Motion** - אנימציות חלקות
- **Lucide React** - אייקונים מודרניים

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - מסד נתונים יחסי
- **Row Level Security (RLS)** - אבטחת נתונים
- **Real-time subscriptions** - עדכונים בזמן אמת

### Development Tools
- **Vite** - כלי build מהיר
- **ESLint** - linting קוד
- **Vitest** - בדיקות יחידה
- **Playwright** - בדיקות E2E
- **PostCSS** - עיבוד CSS

## 📁 מבנה הפרויקט

```
zomet/
├── src/
│   ├── components/          # רכיבי React
│   │   ├── ui/             # רכיבי UI בסיסיים
│   │   ├── auth/           # רכיבי אימות
│   │   ├── dashboard/      # רכיבי דשבורד
│   │   ├── forms/          # רכיבי טפסים
│   │   └── navigation/     # רכיבי ניווט
│   ├── pages/              # דפי האפליקציה
│   │   ├── auth/           # דפי אימות
│   │   ├── dashboard/      # דפי דשבורד
│   │   └── admin/          # דפי אדמין
│   ├── services/           # שירותי API
│   ├── hooks/              # React hooks מותאמים
│   ├── utils/              # פונקציות עזר
│   ├── contexts/           # React contexts
│   ├── lib/                # הגדרות ספריות
│   └── styles/             # קבצי CSS
├── public/                 # קבצים סטטיים
├── e2e/                    # בדיקות E2E
├── scripts/                # סקריפטי פיתוח
├── supabase/               # הגדרות Supabase
└── docs/                   # תיעוד
```

## 🚀 התחלה מהירה

### דרישות מקדימות
- Node.js 16+
- npm או yarn
- חשבון Supabase

### התקנה

1. **שכפול הפרויקט**
   ```bash
   git clone <repository-url>
   cd zomet
   ```

2. **התקנת תלויות**
   ```bash
   npm install
   ```

3. **הגדרת משתני סביבה**
   ```bash
   cp .env.example .env
   ```
   ערוך את קובץ `.env` והוסף את פרטי Supabase שלך.

4. **הרצת האפליקציה**
   ```bash
   npm run dev
   ```

האפליקציה תהיה זמינה בכתובת: http://localhost:8080

## 📝 סקריפטים זמינים

### פיתוח
- `npm run dev` - הרצת שרת פיתוח
- `npm run build` - בניית האפליקציה לפרודקשן
- `npm run preview` - תצוגה מקדימה של הבנייה
- `npm run lint` - בדיקת קוד עם ESLint

### בדיקות
- `npm run test` - הרצת בדיקות יחידה
- `npm run test:ui` - ממשק גרפי לבדיקות
- `npm run test:coverage` - דוח כיסוי בדיקות
- `npm run test:e2e` - בדיקות E2E עם Playwright

### Supabase
- `npm run schema:apply` - החלת סכמת מסד נתונים
- `npm run schema:validate` - וולידציה של סכמה
- `npm run schema:fix` - תיקון בעיות סכמה

### אופטימיזציה
- `npm run analyze:bundle` - ניתוח גודל bundle
- `npm run optimize:images` - אופטימיזציה של תמונות
- `npm run performance:audit` - ביקורת ביצועים

## 🔧 הגדרת Supabase

1. צור פרויקט חדש ב-[Supabase](https://supabase.com)
2. העתק את ה-URL וה-API Key לקובץ `.env`
3. הרץ את הסכמה:
   ```bash
   npm run schema:apply
   ```

## 🎨 עיצוב ונגישות

- **Tailwind CSS** - מערכת עיצוב מודולרית
- **Dark/Light Mode** - תמיכה במצבי תצוגה
- **RTL Support** - תמיכה מלאה בעברית וערבית
- **WCAG 2.1** - עמידה בתקני נגישות
- **Keyboard Navigation** - ניווט מלא במקלדת
- **Screen Reader** - תמיכה בקוראי מסך

## 🔐 אבטחה

- **Row Level Security (RLS)** - הגנה ברמת השורה
- **JWT Authentication** - אימות מאובטח
- **Input Validation** - וולידציה של קלטים
- **HTTPS Only** - תקשורת מוצפנת בלבד
- **Environment Variables** - הגנה על מפתחות API

## 📊 ביצועים

- **Code Splitting** - חלוקת קוד לחלקים
- **Lazy Loading** - טעינה עצלה של רכיבים
- **Image Optimization** - אופטימיזציה של תמונות
- **Bundle Analysis** - ניתוח גודל bundle
- **Performance Monitoring** - ניטור ביצועים

**Zomet** - פלטפורמת מכירת רכבים מתקדמת לעתיד הדיגיטלי 🚗✨

## המשך עבודה
 - בדיקה ש2 הדשבורדים עובדים במאה אחוז פונקציולניות וסנכרון מול supabase ומציגים מידע בזמן אמת
 - לבצע את האינטגרציות בעמודי - מחירון רכב, ביטוח, מימון. כולל הטמעת מערכת סליקה -  ליאור יספק את הפרטים
 - בדיקה מקיפה על כל הפרוייקט בsupabase ומעבר על כל הסכמות, טריגרים, רולים וכו ולבדוק שהכל רץ באופן שוטף ויסודי. 


## מה כבר הושלם בsupabase
 - מערכת התחברה/הרשמה באופן מלא 
 - פרופיל משתמש