# SpectrumAtlas - Next.js Version

## 🚀 **Why Next.js Instead of Flask?**

Vercel's Hobby tier has **very limited Python support**:
- ❌ Only 10 seconds execution time for Python functions
- ❌ No persistent connections
- ❌ Limited cold start performance

**Next.js on Vercel Hobby tier:**
- ✅ Full JavaScript/TypeScript support
- ✅ Unlimited execution time
- ✅ Better cold start performance
- ✅ Perfect for static sites + API routes

## 📁 **Project Structure**

```
spectrumatlas/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main globe visualization
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── api/               # API routes
│       ├── messages/      # Supabase data endpoint
│       └── mapbox-token/  # Mapbox token endpoint
├── package.json           # Dependencies
├── next.config.js         # Next.js config
├── tailwind.config.ts     # Tailwind CSS
└── tsconfig.json          # TypeScript config
```

## 🔧 **Key Changes from Flask**

### **Frontend (React + TypeScript)**
- ✅ Same Mapbox globe visualization
- ✅ Same pulsing animation effects
- ✅ Same popup interactions
- ✅ Better performance with React

### **Backend (Next.js API Routes)**
- ✅ `/api/messages` - Supabase data fetching
- ✅ `/api/mapbox-token` - Secure token delivery
- ✅ Serverless functions (no cold start issues)

### **Environment Variables**
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 **Deployment to Vercel**

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Local Development**
```bash
npm run dev
```

### **Step 3: Deploy to Vercel**
1. Connect your GitHub repo to Vercel
2. Choose **"Next.js"** framework preset
3. Set environment variables in Vercel dashboard
4. Deploy!

## 🎯 **Benefits of This Approach**

- ✅ **Works perfectly on Vercel Hobby tier**
- ✅ **Better performance** (React + TypeScript)
- ✅ **Same functionality** as Flask version
- ✅ **Future-proof** (easy to add features)
- ✅ **Cost-effective** (no separate backend hosting)

## 🔄 **Migration from Flask**

The Next.js version maintains **100% feature parity**:
- Same Mapbox globe visualization
- Same Supabase integration
- Same message plotting and animations
- Same popup interactions

**No functionality lost** - just better deployment options! 