#!/usr/bin/env node

const { spawn } = require('child_process');

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log(`Command failed with code ${code}, continuing...`);
        resolve(); // Continue even if command fails
      }
    });
    
    child.on('error', (error) => {
      console.error(`Command error: ${error.message}`);
      resolve(); // Continue even if command fails
    });
  });
}

async function waitForDatabase() {
  console.log('Waiting for database connection...');
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      await runCommand('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
      console.log('Database is ready!');
      return;
    } catch (error) {
      attempts++;
      console.log(`Database not ready, attempt ${attempts}/${maxAttempts}, waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('Database connection timeout, starting server anyway...');
}

async function seedDatabase() {
  console.log('Running database migrations...');
  await runCommand('npx', ['prisma', 'migrate', 'deploy']);
  
  console.log('Seeding database with initial data...');
  await runCommand('node', ['prisma/seed.mjs']);
}

async function startServer() {
  console.log('Starting Next.js server...');
  
  // Start the Next.js server
  const server = spawn('node', ['server.js'], { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
  
  server.on('close', (code) => {
    console.log('Server closed with code:', code);
    process.exit(code || 0);
  });
  
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.kill('SIGINT');
  });
}

async function main() {
  console.log('Starting ERP application...');
  
  try {
    await waitForDatabase();
    await seedDatabase();
    await startServer();
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

main();