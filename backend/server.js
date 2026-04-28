require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

// MongoDB connection (required)
const { connectDB, isMongoConnected } = require('./config/mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['https://meeting.wisdommlpe.site', 'https://dev.meeting.wisdommlpe.site'];
    
    // Add localhost for development
    if (process.env.NODE_ENV !== 'production') {
      if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
      if (!allowedOrigins.includes('http://localhost:3001')) allowedOrigins.push('http://localhost:3001');
      if (!allowedOrigins.includes('http://localhost:5173')) allowedOrigins.push('http://localhost:5173');
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // If CORS_ORIGIN is '*', allow all origins
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.endsWith(ao.replace('https://', '')))) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      console.log('Allowed origins were:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Http Request Logging
app.use(morgan('combined'));

// Rate Limiting Config
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Meeting Summary API is running',
    mongodb: isMongoConnected() ? 'connected' : 'disconnected',
  });
});

// Auth routes (public, no authentication required)
app.use('/api/auth', authRoutes);

// User management routes (protected, admin only)
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// API routes (protected, require authentication)
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize MongoDB and start server
async function startServer() {
  // Validate MongoDB URI is set
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env file');
    console.error('Please set MONGODB_URI to connect to MongoDB');
    process.exit(1);
  }

  // Debug: Log MongoDB URI (mask password for security)
  const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
  console.log('DEBUG: MongoDB URI:', maskedUri);

  // Connect to MongoDB (required)
  console.log('Connecting to MongoDB...');
  await connectDB();
  
  if (!isMongoConnected()) {
    console.error('ERROR: Failed to connect to MongoDB');
    console.error('Please check your MONGODB_URI and ensure MongoDB is running');
    process.exit(1);
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`  Meeting Summary API`);
    console.log(`===========================================`);
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Debug endpoint: http://localhost:${PORT}/api/debug/env`);
    console.log(`MongoDB: Connected ✓`);
    console.log(`===========================================\n`);
  });
}

startServer();
