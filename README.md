# ChatHive - Real-time Chat Application

A modern, real-time chat application built with Node.js, Express, and Socket.IO, optimized for Vercel deployment.

## Features

- Real-time messaging with Socket.IO
- User join/leave notifications
- Modern, responsive UI
- Connection status handling
- XSS protection
- Optimized for production deployment

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Vercel Deployment

This project is optimized for Vercel deployment with the following features:

### Automatic Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Vercel
3. Vercel will automatically deploy your application

### Manual Deployment

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy to Vercel:

```bash
vercel
```

### Environment Variables

For production deployment, you may want to set these environment variables in your Vercel dashboard:

- `NODE_ENV`: Set to "production"
- `SOCKET_IO_CORS_ORIGIN`: Set to your domain (e.g., "https://your-app.vercel.app")

## Project Structure

```
chatroom/
├── public/
│   ├── index.html          # Main HTML file
│   ├── style.css          # Styling
│   └── code.js            # Client-side JavaScript
├── server.js              # Express server with Socket.IO
├── package.json           # Dependencies and scripts
├── vercel.json           # Vercel deployment configuration
├── .vercelignore         # Files to exclude from deployment
└── .env.example          # Environment variables template
```

## Technical Optimizations

### Performance

- Minimized dependencies (only Express and Socket.IO)
- Optimized Socket.IO configuration
- Resource preloading in HTML
- Efficient static file serving

### Production Ready

- Environment-based configuration
- Health check endpoint
- Error handling and reconnection logic
- XSS protection
- CORS configuration

### Vercel Specific

- Proper routing configuration for Socket.IO
- Serverless function optimization
- Static asset optimization

## Dependencies

- **express**: Web framework
- **socket.io**: Real-time communication

## Browser Support

- Modern browsers with WebSocket support
- Fallback to polling for older browsers

## License

ISC
