/**
 * Production Entry Point for Hostinger and other Shared Hosting environments.
 * This file boots up the pre-compiled server in dist/server.cjs.
 */

// Force production environment
process.env.NODE_ENV = 'production';

// Import and execute the compiled CommonJS bundle
import './dist/server.cjs';
