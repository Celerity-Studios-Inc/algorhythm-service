"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SeedingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedingService = void 0;
const common_1 = require("@nestjs/common");
const scoring_service_1 = require("../scoring/scoring.service");
const nna_registry_service_1 = require("../nna-integration/nna-registry.service");
let SeedingService = SeedingService_1 = class SeedingService {
    constructor(scoringService, nnaRegistryService) {
        this.scoringService = scoringService;
        this.nnaRegistryService = nnaRegistryService;
        this.logger = new common_1.Logger(SeedingService_1.name);
    }
    async seedCompatibilityScores() {
        this.logger.log('Starting compatibility score seeding...');
        try {
            const songs = await this.nnaRegistryService.getAssetsByLayer('G', 1000);
            this.logger.log(`Found ${songs.length} songs`);
            let totalProcessed = 0;
            let batchSize = 10;
            for (let i = 0; i < songs.length; i += batchSize) {
                const songBatch = songs.slice(i, i + batchSize);
                await Promise.all(songBatch.map(async (song) => {
                    try {
                        const composites = await this.nnaRegistryService.getCompositesBySong(song.nna_address);
                        if (composites.length > 0) {
                            await this.scoringService.scoreTemplates(song, composites);
                            totalProcessed++;
                            if (totalProcessed % 10 === 0) {
                                this.logger.log(`Processed ${totalProcessed}/${songs.length} songs...`);
                            }
                        }
                    }
                    catch (error) {
                        this.logger.error(`Error processing song ${song.nna_address}:`, error.message);
                    }
                }));
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.logger.log(`✅ Seeding complete! Processed ${totalProcessed} songs`);
        }
        catch (error) {
            this.logger.error('❌ Seeding failed:', error);
            throw error;
        }
    }
    async warmupCache() {
        this.logger.log('Starting cache warmup...');
        try {
            const popularSongs = await this.nnaRegistryService.getAssetsByLayer('G', 50);
            for (const song of popularSongs) {
                try {
                    const composites = await this.nnaRegistryService.getCompositesBySong(song.nna_address);
                    if (composites.length > 0) {
                        await this.scoringService.scoreTemplates(song, composites);
                    }
                }
                catch (error) {
                    this.logger.error(`Error warming up cache for song ${song.nna_address}:`, error.message);
                }
            }
            this.logger.log('✅ Cache warmup complete!');
        }
        catch (error) {
            this.logger.error('❌ Cache warmup failed:', error);
            throw error;
        }
    }
};
exports.SeedingService = SeedingService;
exports.SeedingService = SeedingService = SeedingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService,
        nna_registry_service_1.NnaRegistryService])
], SeedingService);
//# sourceMappingURL=seeding.service.js.map