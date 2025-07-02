import express from 'express';
import bodyParser from 'body-parser';
import { clubRoutes } from './routes/clubRoutes.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { extractUserFromHeaders } from './middlewares/authMiddleware.js';
import { connectToDatabase, closeConnection } from './config/database.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(bodyParser.json());

// Extract user info from headers (set by API Gateway)
app.use(extractUserFromHeaders);

// Routes
app.use(clubRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Connect to database and start server
async function startServer() {
  try {
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`Club service running on http://localhost:${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await closeConnection();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
