const express = require('express');
const router = express.Router();

const consumerService = require('../services/consumerService');
const emailService = require('../services/emailService');
const rabbitmqConfig = require('../config/rabbitmq');
const notificationHandler = require('../handlers/notificationHandler');
const logger = require('../config/logger');

/**
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const health = await getBasicHealthStatus();
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed health check endpoint
 */
router.get('/detailed', async (req, res) => {
  try {
    const [consumersHealth, emailHealth, rabbitmqHealth] = await Promise.all([
      consumerService.getHealthStatus(),
      emailService.getHealthStatus(),
      rabbitmqConfig.healthCheck()
    ]);

    const overall = consumersHealth.healthy && emailHealth.healthy && rabbitmqHealth.healthy;

    const detailedHealth = {
      status: overall ? 'healthy' : 'unhealthy',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      components: {
        consumers: {
          status: consumersHealth.healthy ? 'healthy' : 'unhealthy',
          details: consumersHealth
        },
        email: {
          status: emailHealth.healthy ? 'healthy' : 'unhealthy',
          details: emailHealth
        },
        rabbitmq: {
          status: rabbitmqHealth.healthy ? 'healthy' : 'unhealthy',
          details: rabbitmqHealth
        },
        notification_handler: {
          status: 'healthy',
          details: notificationHandler.getStats()
        }
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        node_version: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    const statusCode = overall ? 200 : 503;
    res.status(statusCode).json(detailedHealth);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Readiness probe endpoint
 */
router.get('/readiness', async (req, res) => {
  try {
    const ready = await isServiceReady();
    
    if (ready) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Statistics endpoint
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      consumers: consumerService.getStats(),
      email: emailService.getStats(),
      rabbitmq: rabbitmqConfig.getStatus(),
      notification_handler: notificationHandler.getStats(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoints (should be protected in production)

/**
 * Restart consumers endpoint
 */
router.post('/admin/consumers/restart', async (req, res) => {
  try {
    logger.info('Restarting consumers via admin endpoint', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    await consumerService.stopConsumers();
    await consumerService.startConsumers();

    res.json({
      message: 'Consumers restarted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to restart consumers:', error);
    res.status(500).json({
      error: 'Failed to restart consumers',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset statistics endpoint
 */
router.post('/admin/stats/reset', (req, res) => {
  try {
    logger.info('Resetting statistics via admin endpoint', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    consumerService.resetStats();
    emailService.resetStats();

    res.json({
      message: 'Statistics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset statistics:', error);
    res.status(500).json({
      error: 'Failed to reset statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clear email template cache endpoint
 */
router.post('/admin/templates/reload', (req, res) => {
  try {
    logger.info('Reloading email templates via admin endpoint', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    emailService.clearTemplateCache();

    res.json({
      message: 'Email templates cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reload templates:', error);
    res.status(500).json({
      error: 'Failed to reload templates',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Send test email endpoint
 */
router.post('/admin/email/test', async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email address is required',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Sending test email via admin endpoint', {
      email,
      type,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    let result;
    
    switch (type) {
      case 'verification':
        result = await emailService.sendEmailVerification({
          userId: 'test-user',
          email,
          link: 'https://example.com/verify/test',
          fullName: 'Test User'
        });
        break;
      
      case 'password-reset':
        result = await emailService.sendPasswordReset({
          userId: 'test-user',
          email,
          link: 'https://example.com/reset/test',
          fullName: 'Test User'
        });
        break;
      
      default:
        return res.status(400).json({
          error: 'Invalid email type. Supported types: verification, password-reset',
          timestamp: new Date().toISOString()
        });
    }

    res.json({
      message: `Test ${type} email sent successfully`,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to send test email:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to get basic health status
 */
async function getBasicHealthStatus() {
  try {
    const [consumersHealth, emailHealth, rabbitmqHealth] = await Promise.all([
      consumerService.getHealthStatus(),
      emailService.getHealthStatus(),
      rabbitmqConfig.healthCheck()
    ]);

    // In development/test, email config is optional - only check critical components
    const isDevelopment = process.env.NODE_ENV === 'development';
    const criticalHealthy = consumersHealth.healthy && rabbitmqHealth.healthy;
    
    return {
      healthy: isDevelopment ? criticalHealthy : (criticalHealthy && emailHealth.healthy)
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Helper function to check if service is ready
 */
async function isServiceReady() {
  try {
    // Check if all critical components are ready
    const consumersRunning = consumerService.isConsumersRunning();
    const rabbitmqConnected = rabbitmqConfig.getStatus().connected;
    
    return consumersRunning && rabbitmqConnected;
  } catch (error) {
    return false;
  }
}

/**
 * Version endpoint for deployment verification
 */
router.get('/version', (req, res) => {
  res.json({
    service: 'notify-service',
    version: '1.0.1',
    deployedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    gitCommit: process.env.GIT_COMMIT || 'local-development',
    buildNumber: process.env.BUILD_NUMBER || Date.now().toString()
  });
});

module.exports = router; 