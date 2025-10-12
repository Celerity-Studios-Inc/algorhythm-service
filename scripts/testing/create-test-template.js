#!/usr/bin/env node

/**
 * Create Test Template for AlgoRhythm Recommendations
 * 
 * This script creates a test template (composite) that combines
 * a song with placeholder assets from other layers to enable
 * AlgoRhythm recommendations to work.
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.REGISTRY_MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function createTestTemplate() {
    let client;
    try {
        console.log('🔗 Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const assets = db.collection('assets');
        
        // Find the song we want to create a template for
        const song = await assets.findOne({ 
            name: 'G.POP.CON.003',
            layer: 'G' 
        });
        
        if (!song) {
            console.error('❌ Song G.POP.CON.003 not found');
            return;
        }
        
        console.log('✅ Found song:', song.name, '→', song.nna_address);
        
        // Create placeholder assets for other layers
        const placeholderAssets = [
            {
                layer: 'S',
                category: 'POP',
                subcategory: 'DIV',
                name: 'S.POP.DIV.001',
                friendlyName: 'S.POP.DIV.001',
                nna_address: '2.001.002.001',
                description: 'Test star for recommendations',
                tags: ['test', 'pop', 'dancer'],
                source: 'test-script',
                registeredBy: 'test-script',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                layer: 'L',
                category: 'CAS',
                subcategory: 'STR',
                name: 'L.CAS.STR.001',
                friendlyName: 'L.CAS.STR.001',
                nna_address: '3.001.002.001',
                description: 'Test look for recommendations',
                tags: ['test', 'casual', 'streetwear'],
                source: 'test-script',
                registeredBy: 'test-script',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                layer: 'M',
                category: 'POP',
                subcategory: 'DAN',
                name: 'M.POP.DAN.001',
                friendlyName: 'M.POP.DAN.001',
                nna_address: '4.001.002.001',
                description: 'Test move for recommendations',
                tags: ['test', 'pop', 'dance'],
                source: 'test-script',
                registeredBy: 'test-script',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                layer: 'W',
                category: 'URB',
                subcategory: 'STR',
                name: 'W.URB.STR.001',
                friendlyName: 'W.URB.STR.001',
                nna_address: '5.001.002.001',
                description: 'Test world for recommendations',
                tags: ['test', 'urban', 'street'],
                source: 'test-script',
                registeredBy: 'test-script',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // Insert placeholder assets
        console.log('📝 Creating placeholder assets...');
        for (const asset of placeholderAssets) {
            const existing = await assets.findOne({ nna_address: asset.nna_address });
            if (!existing) {
                await assets.insertOne(asset);
                console.log('✅ Created:', asset.name, '→', asset.nna_address);
            } else {
                console.log('⚠️  Already exists:', asset.name);
            }
        }
        
        // Create the template (composite)
        const template = {
            layer: 'C',
            category: 'POP',
            subcategory: 'TMP',
            name: 'C.POP.TMP.001',
            friendlyName: 'C.POP.TMP.001',
            nna_address: '6.001.002.001',
            description: 'Test template for G.POP.CON.003 recommendations',
            tags: ['test', 'template', 'pop'],
            source: 'test-script',
            registeredBy: 'test-script',
            components: [
                song.nna_address,      // Song: 1.018.002.003
                '2.001.002.001',      // Star: S.POP.DIV.001
                '3.001.002.001',      // Look: L.CAS.STR.001
                '4.001.002.001',      // Move: M.POP.DAN.001
                '5.001.002.001'       // World: W.URB.STR.001
            ],
            componentAssets: [
                {
                    layer: 'G',
                    nna_address: song.nna_address,
                    name: song.name
                },
                {
                    layer: 'S',
                    nna_address: '2.001.002.001',
                    name: 'S.POP.DIV.001'
                },
                {
                    layer: 'L',
                    nna_address: '3.001.002.001',
                    name: 'L.CAS.STR.001'
                },
                {
                    layer: 'M',
                    nna_address: '4.001.002.001',
                    name: 'M.POP.DAN.001'
                },
                {
                    layer: 'W',
                    nna_address: '5.001.002.001',
                    name: 'W.URB.STR.001'
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Insert template
        const existingTemplate = await assets.findOne({ nna_address: template.nna_address });
        if (!existingTemplate) {
            await assets.insertOne(template);
            console.log('✅ Created template:', template.name, '→', template.nna_address);
        } else {
            console.log('⚠️  Template already exists:', template.name);
        }
        
        console.log('🎉 Test template creation completed!');
        console.log('📊 Template components:');
        template.componentAssets.forEach(comp => {
            console.log(`   ${comp.layer}: ${comp.name} (${comp.nna_address})`);
        });
        
    } catch (error) {
        console.error('❌ Error creating test template:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Run the script
createTestTemplate().catch(console.error);
