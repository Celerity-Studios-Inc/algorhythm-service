#!/usr/bin/env node

/**
 * Generate Webhook Secrets for All Environments
 * This script generates secure webhook secrets for dev, staging, and production
 */

const crypto = require('crypto');

console.log('🔐 Generating webhook secrets for all environments...\n');

// Generate secure secrets for each environment
const environments = ['dev', 'stg', 'prod'];
const secrets = {};

environments.forEach(env => {
  secrets[env] = crypto.randomBytes(32).toString('hex');
});

console.log('📋 Generated Webhook Secrets:');
console.log('================================\n');

environments.forEach(env => {
  console.log(`🔧 ${env.toUpperCase()} Environment:`);
  console.log(`   WEBHOOK_SECRET=${secrets[env]}`);
  console.log(`   ALGORHYTHM_WEBHOOK_URL=https://algorhythm.${env}.reviz.dev/webhooks`);
  console.log(`   NNA_REGISTRY_WEBHOOK_URL=https://registry.${env}.reviz.dev/webhooks`);
  console.log('');
});

console.log('📝 GitHub Repository Secrets to Add:');
console.log('====================================\n');

console.log('For Algorhythm Service Repository:');
environments.forEach(env => {
  console.log(`WEBHOOK_SECRET_${env.toUpperCase()}=${secrets[env]}`);
});
console.log('');

console.log('For NNA Registry Service Repository:');
environments.forEach(env => {
  console.log(`ALGORHYTHM_WEBHOOK_SECRET_${env.toUpperCase()}=${secrets[env]}`);
});
console.log('');

console.log('🔧 Google Cloud Secret Manager Commands:');
console.log('========================================\n');

environments.forEach(env => {
  const projectId = `algorhythm-${env}`;
  console.log(`# ${env.toUpperCase()} Environment (Project: ${projectId})`);
  console.log(`gcloud config set project ${projectId}`);
  console.log(`echo -n "${secrets[env]}" | gcloud secrets create algorhythm-webhook-secret \\`);
  console.log(`  --data-file=- \\`);
  console.log(`  --labels=environment=${env},service=algorhythm,type=webhook \\`);
  console.log(`  --replication-policy=automatic`);
  console.log('');
});

console.log('🎯 Next Steps:');
console.log('==============');
console.log('1. Add the GitHub repository secrets above');
console.log('2. Run the Google Cloud Secret Manager commands');
console.log('3. Update Cloud Run services to use the secrets');
console.log('4. Test webhook integration');
console.log('');

console.log('✅ Webhook secrets generated successfully!');
