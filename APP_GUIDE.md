
# ShopWell.ai - React Native App Guide

## Overview

ShopWell.ai is a comprehensive health-focused shopping app that helps users make smarter, healthier choices. The app includes authentication, product scanning, shopping lists, health insights, and native OS features like notifications and sharing.

## Features Implemented

### ✅ Authentication
- **Login Screen** (`app/(auth)/login.tsx`)
- **Signup Screen** (`app/(auth)/signup.tsx`)
- **Auth Context** (`contexts/AuthContext.tsx`) - Manages user state
- Secure storage using `expo-secure-store`
- Auto-redirect based on authentication state

### ✅ Core Features
1. **Home Dashboard** (`app/(tabs)/(home)/index.tsx`)
   - Welcome message with user name
   - Quick access to all features
   - Stats overview (products scanned, lists, health score)

2. **Product Scanner** (`app/(tabs)/(home)/scan.tsx`)
   - Barcode scanning simulation
   - Health score display
   - Nutrition facts breakdown
   - Ingredients list
   - Share product functionality
   - Add to shopping list

3. **Product Search** (`app/(tabs)/(home)/search.tsx`)
   - Search products by name or brand
   - Grid view with product cards
   - Health score badges
   - Product images

4. **Shopping Lists** (`app/(tabs)/(home)/shopping-lists.tsx`)
   - Create new lists
   - View all lists with progress
   - Share lists
   - Delete lists
   - Progress tracking

5. **Health Insights** (`app/(tabs)/(home)/insights.tsx`)
   - Weekly health score
   - Products scanned count
   - Nutrition breakdown charts
   - Personalized recommendations

6. **Profile** (`app/(tabs)/profile.tsx`)
   - User information
   - Account settings

### ✅ Native OS Features

#### 📱 Push Notifications
- **Hook**: `hooks/useNotifications.ts`
- **Features**:
  - Request notification permissions
  - Schedule local notifications
  - Handle notification responses
  - Android notification channels
  - Expo push token generation

**Usage Example**:
```typescript
const { schedulePushNotification } = useNotifications();

// Schedule a notification
await schedulePushNotification(
  'Product Scanned!',
  'Health Score: 87/100'
);
```

#### 🔗 Sharing
- **Hook**: `hooks/useSharing.ts`
- **Features**:
  - Share text content
  - Share products with health scores
  - Share shopping lists
  - Cross-platform support (iOS, Android, Web)

**Usage Example**:
```typescript
const { shareProduct, shareShoppingList } = useSharing();

// Share a product
await shareProduct('Organic Bread', 87);

// Share a shopping list
await shareShoppingList('Weekly Groceries', 12);
```

### ✅ Navigation & UI
- **Header Buttons** (`components/HeaderButtons.tsx`)
  - Left button: Opens Settings
  - Right button: Opens Create screen
- **Create Screen** (`app/create.tsx`)
  - Quick actions for common tasks
  - Create new shopping lists
- **Settings Screen** (`app/settings.tsx`)
  - Account information
  - Notification preferences
  - Dark mode toggle (coming soon)
  - App information
  - Logout functionality

## App Structure

```
app/
├── (auth)/
│   ├── login.tsx          # Login screen
│   └── signup.tsx         # Signup screen
├── (tabs)/
│   ├── (home)/
│   │   ├── index.tsx      # Home dashboard
│   │   ├── scan.tsx       # Product scanner
│   │   ├── search.tsx     # Product search
│   │   ├── shopping-lists.tsx  # Shopping lists
│   │   └── insights.tsx   # Health insights
│   └── profile.tsx        # User profile
├── create.tsx             # Create new items
├── settings.tsx           # App settings
└── _layout.tsx            # Root layout with auth routing

contexts/
├── AuthContext.tsx        # Authentication state management
└── WidgetContext.tsx      # Widget state management

hooks/
├── useNotifications.ts    # Push notifications hook
└── useSharing.ts          # Sharing functionality hook

components/
├── HeaderButtons.tsx      # Header navigation buttons
├── IconSymbol.tsx         # Cross-platform icons
└── ...

styles/
└── commonStyles.ts        # Shared styles and colors

types/
├── auth.ts               # Auth types
└── product.ts            # Product types
```

## Backend Integration (Supabase)

### 🔧 To Enable Backend Features:

The app currently uses local storage and mock data. To enable full backend functionality:

1. **Enable Supabase**:
   - Click the "Supabase" button in the Natively IDE
   - Connect to an existing Supabase project or create a new one
   - Your Supabase URL and anon key will be automatically configured

2. **Database Tables to Create**:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT UNIQUE,
  health_score INTEGER,
  category TEXT,
  price DECIMAL,
  image_url TEXT,
  ingredients TEXT[],
  nutrition_facts JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shopping lists table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shopping list items table
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES shopping_lists ON DELETE CASCADE,
  product_id UUID REFERENCES products,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scanned products history
CREATE TABLE scanned_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES products,
  scanned_at TIMESTAMP DEFAULT NOW()
);
```

3. **Update Auth Context**:
   - Replace mock authentication in `contexts/AuthContext.tsx` with Supabase auth
   - Use `supabase.auth.signInWithPassword()` for login
   - Use `supabase.auth.signUp()` for signup

4. **Update Data Fetching**:
   - Replace mock data with Supabase queries
   - Use Supabase Realtime for live updates
   - Implement proper error handling

### Example Supabase Integration:

```typescript
// Install Supabase client
// npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Login example
const { data, error } = await supabase.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});

// Fetch shopping lists
const { data: lists, error } = await supabase
  .from('shopping_lists')
  .select('*')
  .eq('user_id', user.id);
```

## Color Scheme

The app uses a clean, health-focused color palette:

- **Primary**: `#29ABE2` (Blue) - Main actions, links
- **Secondary**: `#FFC107` (Amber) - Highlights, warnings
- **Accent**: `#00A86B` (Green) - Success, healthy choices
- **Background**: `#F5F5F5` (Light Gray)
- **Card**: `#FFFFFF` (White)
- **Text**: `#212121` (Dark Gray)
- **Text Secondary**: `#757575` (Medium Gray)
- **Error**: `#F44336` (Red)
- **Success**: `#4CAF50` (Green)

## Testing the App

### Test Notifications:
1. Navigate to the Scan screen
2. Tap "Start Scan"
3. Wait 2 seconds for the scan to complete
4. You should receive a notification about the scanned product

### Test Sharing:
1. Scan a product or view a shopping list
2. Tap the share button
3. Choose how to share (varies by platform)

### Test Authentication:
1. Start at the login screen
2. Enter any email and password
3. Tap "Log In" (currently uses mock auth)
4. You'll be redirected to the home screen

## Next Steps

1. **Enable Supabase** for real backend functionality
2. **Implement real barcode scanning** using `expo-camera` and a barcode scanning library
3. **Add product database** with real nutrition information
4. **Implement AI-powered recommendations** using OpenAI API
5. **Add social features** (share with friends, compare health scores)
6. **Implement offline mode** with local database sync
7. **Add more detailed analytics** and charts
8. **Implement push notification campaigns** for health tips

## Notes

- The app currently uses mock data for demonstration
- Authentication is stored locally using `expo-secure-store`
- All features are fully functional with local state
- Notifications work on physical devices (limited on simulators)
- Sharing works on all platforms with platform-specific UI

## Support

For issues or questions about the app:
1. Check the console logs for errors
2. Ensure all dependencies are installed
3. Test on a physical device for full native features
4. Enable Supabase for backend functionality

---

**Built with React Native, Expo 54, and ❤️**
