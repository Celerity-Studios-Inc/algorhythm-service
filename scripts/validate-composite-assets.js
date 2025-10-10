#!/usr/bin/env node

/**
 * Validate Composite Assets
 * Checks for C.FUL composites and validates GCP URLs
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function validateCompositeAssets() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Validating composite assets...');
    
    // Check C.FUL composites
    const cFulComposites = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    console.log(`📊 Found ${cFulComposites.length} C.FUL composites`);
    
    // Check C.PAR composites
    const cParComposites = await assets.find({ 
      name: { $regex: /^C\.PAR\./ } 
    }).toArray();
    
    console.log(`📊 Found ${cParComposites.length} C.PAR composites`);
    
    // Validate GCP URLs
    const compositesWithGcpUrls = cFulComposites.filter(composite => 
      composite.gcpStorageUrl && composite.gcpStorageUrl.includes('storage.googleapis.com')
    );
    
    console.log(`✅ ${compositesWithGcpUrls.length}/${cFulComposites.length} C.FUL composites have GCP URLs`);
    
    // Log any issues
    const compositesWithoutGcpUrls = cFulComposites.filter(composite => 
      !composite.gcpStorageUrl || !composite.gcpStorageUrl.includes('storage.googleapis.com')
    );
    
    if (compositesWithoutGcpUrls.length > 0) {
      console.log(`⚠️  ${compositesWithoutGcpUrls.length} C.FUL composites missing GCP URLs:`);
      compositesWithoutGcpUrls.forEach(composite => {
        console.log(`   - ${composite.name} (${composite.nna_address})`);
      });
    }
    
    console.log('✅ Composite asset validation completed');
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
  } finally {
    await client.close();
  }
}

validateCompositeAssets();
