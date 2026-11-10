# Genuine Edu-Solutions — Dynamic Courses Admin

## Files
- `admin.html`, `admin.css`, `admin.js`: updated admin dashboard with Courses management.
- `courses-public.js`: public website Firestore renderer for the `#ccGrid` courses section.
- `firestore.rules.example` and `storage.rules.example`: starter rules to adapt to your existing rules.

## Install
1. Back up your current admin files.
2. Replace the existing admin HTML/CSS/JS with these files.
3. Enable Firebase Storage in the same Firebase project.
4. Publish appropriate Firestore and Storage rules (do not use open test rules in production).
5. Add this to the public website after its existing course section markup, or load it as a module:
   `<script type="module" src="courses-public.js"></script>`
6. Ensure your public website has `#ccGrid` and category buttons with `.chip-f` and `data-f="all|health|biz|tech"`.

## Firestore document schema (`courses/{courseId}`)
{
  "title": "BSc Nursing",
  "category": "health",
  "description": "Explore undergraduate nursing education and admission options.",
  "imageUrl": "https://...",
  "imagePath": "courses/1730000000000_image.jpg",
  "displayOrder": 1,
  "active": true,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}

`imageUrl` and `imagePath` are empty strings when no image is used. Public cards only display active courses. Existing SVG fallbacks are used when no image is set or the image fails to load.

## Important
The public query uses `where("active", "==", true)` and `orderBy("displayOrder", "asc")`. Firestore may ask you to create a composite index; follow the Firebase Console link shown in the browser console.
