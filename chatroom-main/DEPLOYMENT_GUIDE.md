# Vercel Deployment Instructions

## ⚠️ Important Notice

This chat application uses Socket.IO for real-time communication. **Socket.IO has limitations with Vercel's serverless architecture** and may not work as expected.

## Quick Fix for Vercel

For a Vercel-compatible version, I recommend converting this to a simple polling-based chat or using WebRTC. However, here's how to deploy the current version:

### Step 1: Deploy to Vercel

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. In your project directory, run:
```bash
vercel
```

3. Follow the prompts and deploy

### Step 2: Alternative - Use Better Hosting for Socket.IO

For full functionality, deploy to platforms that support WebSocket connections:

**Recommended platforms:**
- **Railway**: `railway.app` (easiest)
- **Render**: `render.com` (free tier available)
- **Heroku**: `heroku.com`
- **DigitalOcean App Platform**

### Railway Deployment (Recommended)
1. Go to `railway.app`
2. Connect your GitHub repository
3. Deploy with one click
4. Set PORT environment variable (Railway handles this automatically)

## JSON Validation Fixed

All JSON files have been validated and fixed:
- ✅ `package.json` - Valid
- ✅ `vercel.json` - Valid

## Files Created/Modified

1. **vercel.json** - Updated to use correct entry points
2. **index.js** - New Express server for static files
3. **api/socket.js** - Socket.IO handler for Vercel (limited functionality)
4. **package.json** - Updated main entry point
5. **public/code.js** - Updated socket path for Vercel

## Test Locally

```bash
npm install
npm start
```

Visit `http://localhost:3000`
