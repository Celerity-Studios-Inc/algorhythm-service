import { Injectable, Logger } from '@nestjs/common';
import { ScoringService } from '../scoring/scoring.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    private readonly scoringService: ScoringService,
    private readonly nnaRegistryService: NnaRegistryService,
  ) {}

  async seedCompatibilityScores(): Promise<void> {
    this.logger.log('Starting compatibility score seeding...');

    try {
      // Get all songs
      const songs = await this.nnaRegistryService.getAssetsByLayer('G', 1000);
      this.logger.log(`Found ${songs.length} songs`);

      let totalProcessed = 0;
      let batchSize = 10;

      for (let i = 0; i < songs.length; i += batchSize) {
        const songBatch = songs.slice(i, i + batchSize);
        
        await Promise.all(songBatch.map(async (song) => {
          try {
            // Get composites for this song
            const composites = await this.nnaRegistryService.getCompositesBySong(song.nna_address);
            
            if (composites.length > 0) {
              // Score templates for this song
              await this.scoringService.scoreTemplates(song, composites);
              totalProcessed++;
              
              if (totalProcessed % 10 === 0) {
                this.logger.log(`Processed ${totalProcessed}/${songs.length} songs...`);
              }
            }
          } catch (error) {
            this.logger.error(`Error processing song ${song.nna_address}:`, error.message);
          }
        }));
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.logger.log(`✅ Seeding complete! Processed ${totalProcessed} songs`);
    } catch (error) {
      this.logger.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async warmupCache(): Promise<void> {
    this.logger.log('Starting cache warmup...');

    try {
      // Get popular songs and pre-compute recommendations
      const popularSongs = await this.nnaRegistryService.getAssetsByLayer('G', 50);
      
      for (const song of popularSongs) {
        try {
          const composites = await this.nnaRegistryService.getCompositesBySong(song.nna_address);
          if (composites.length > 0) {
            await this.scoringService.scoreTemplates(song, composites);
          }
        } catch (error) {
          this.logger.error(`Error warming up cache for song ${song.nna_address}:`, error.message);
        }
      }

      this.logger.log('✅ Cache warmup complete!');
    } catch (error) {
      this.logger.error('❌ Cache warmup failed:', error);
      throw error;
    }
  }
}
