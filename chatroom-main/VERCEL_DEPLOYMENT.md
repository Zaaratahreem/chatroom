# A2Z Chat - Vercel Deployment Guide

## Important Note about Socket.IO and Vercel

⚠️ **Socket.IO has limitations with Vercel's serverless architecture**. While this project has been configured to work with Vercel, real-time features may not work as expected due to the stateless nature of serverless functions.

## Recommended Hosting Alternatives

For full Socket.IO functionality, consider these alternatives:

1. **Railway** - [railway.app](https://railway.app)
2. **Render** - [render.com](https://render.com) 
3. **Heroku** - [heroku.com](https://heroku.com)
4. **DigitalOcean App Platform** - [digitalocean.com](https://www.digitalocean.com/products/app-platform)

## Vercel Deployment Instructions

If you still want to deploy to Vercel (with limited real-time functionality):

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

### Option 3: Deploy via Vercel Dashboard

1. Zip your project folder
2. Go to [vercel.com](https://vercel.com)
3. Click "Deploy" and upload your zip file

## Local Development

To run locally:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Files Modified for Vercel Compatibility

- `vercel.json` - Vercel configuration
- `package.json` - Updated main entry point and scripts
- `index.js` - New Express server for static file serving
- `api/socket.js` - Socket.IO handler for Vercel
- `public/code.js` - Updated socket connection path

## Alternative: Full Socket.IO Version

For the original full-featured version with complete Socket.IO support, use `server.js` and deploy to a platform that supports long-running processes.

## Environment Variables

No environment variables are required for basic deployment.

## Troubleshooting

1. **"Invalid JSON" Error**: Ensure all JSON files are properly formatted
2. **Socket.IO Not Working**: This is expected on Vercel - use alternative hosting
3. **Static Files Not Loading**: Check the `public` folder structure

## Support

For issues related to Socket.IO functionality on Vercel, please consider using alternative hosting platforms listed above.
