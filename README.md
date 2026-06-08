# 🍽 Staff Control — בקרת כוח אדם לקייטרינג

מערכת לניהול ובקרת נוכחות עובדים בתחנות קייטרינג.

## תכונות

- ✅ הזנת נוכחות יומית לפי תחנה וסוג עובד
- 📊 דשבורד עם גרפים ועוגות ומגמות
- 🏪 ניהול תחנות עם הגדרת מינימום עובדים
- 📋 היסטוריה מלאה עם סינון לפי תחנה וחודש
- 💾 שמירה מקומית ב-localStorage
- ⬇ ייצוא/ייבוא JSON לגיבוי

---

## 🚀 העלאה ל-GitHub Pages

### שלב 1 — צור Repository

1. היכנס ל-[github.com](https://github.com) וצור חשבון אם אין לך
2. לחץ על **New repository**
3. תן שם: `catering-tracker` (או כל שם אחר)
4. ודא שהוא **Public**
5. לחץ **Create repository**

### שלב 2 — העלה את הקבצים

**אפשרות א׳ – ממשק גרפי (ללא Git):**

1. בדף ה-Repository החדש, לחץ **uploading an existing file**
2. גרור את 4 הקבצים האלה:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. לחץ **Commit changes**

**אפשרות ב׳ – Git (למי שמכיר):**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/catering-tracker.git
git push -u origin main
```

### שלב 3 — הפעל GitHub Pages

1. כנס ל-**Settings** של ה-Repository
2. בצד שמאל לחץ **Pages**
3. תחת **Source**, בחר **Deploy from a branch**
4. בחר ענף: `main` ותיקייה: `/ (root)`
5. לחץ **Save**

### שלב 4 — גישה לאתר

אחרי כ-2 דקות, האתר יהיה זמין בכתובת:

```
https://USERNAME.github.io/catering-tracker/
```

(החלף `USERNAME` עם שם המשתמש שלך ב-GitHub)

---

## 💡 שימוש

| עמוד | תיאור |
|------|-------|
| **דשבורד** | סיכום, גרפים ומגמות לפי תקופה |
| **הזנת נוכחות** | הכנסת מספר עובדים לפי תחנה ויום |
| **היסטוריה** | צפייה בכל ההזנות עם סינון |
| **ניהול תחנות** | הוספה/עריכה/מחיקה של תחנות ומינימומים |
| **הגדרות** | ניהול תפקידים, ייצוא/ייבוא |

---

> הנתונים נשמרים **מקומית בדפדפן** של כל משתמש. לשיתוף נתונים בין מנהלים, השתמש בייצוא/ייבוא JSON.
