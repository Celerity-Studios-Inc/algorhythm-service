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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const compatibility_score_schema_1 = require("../../models/compatibility-score.schema");
const rule_based_scoring_service_1 = require("./algorithms/rule-based-scoring.service");
const freshness_boost_service_1 = require("./algorithms/freshness-boost.service");
const diversity_service_1 = require("./algorithms/diversity.service");
let ScoringService = ScoringService_1 = class ScoringService {
    constructor(compatibilityScoreModel, ruleBasedScoringService, freshnessBoostService, diversityService) {
        this.compatibilityScoreModel = compatibilityScoreModel;
        this.ruleBasedScoringService = ruleBasedScoringService;
        this.freshnessBoostService = freshnessBoostService;
        this.diversityService = diversityService;
        this.logger = new common_1.Logger(ScoringService_1.name);
    }
    async scoreTemplates(song, templates, userPreferences) {
        this.logger.debug(`Scoring ${templates.length} templates for song: ${song.nna_address}`);
        const scoredTemplates = [];
        for (const template of templates) {
            try {
                let compatibilityScore = await this.getCachedScore(song.nna_address, template.nna_address);
                if (!compatibilityScore) {
                    compatibilityScore = await this.computeCompatibilityScore(song, template, userPreferences);
                    await this.cacheScore(song, template, compatibilityScore);
                }
                const freshnessBoost = this.freshnessBoostService.calculateBoost(template.createdAt);
                const finalScore = Math.min(compatibilityScore.base_score * freshnessBoost, 1.0);
                const templateRecommendation = {
                    template_id: template._id,
                    template_name: template.name,
                    nna_address: template.nna_address,
                    compatibility_score: finalScore,
                    components: this.extractComponents(template),
                    metadata: {
                        created_at: template.createdAt,
                        tags: template.tags || [],
                        description: template.description,
                    },
                    scoring_details: {
                        ...compatibilityScore.score_breakdown,
                        base_score: compatibilityScore.base_score,
                        freshness_boost: freshnessBoost,
                        final_score: finalScore,
                    },
                };
                scoredTemplates.push(templateRecommendation);
            }
            catch (error) {
                this.logger.error(`Failed to score template ${template.nna_address}:`, error);
            }
        }
        this.logger.debug(`Successfully scored ${scoredTemplates.length} templates`);
        return scoredTemplates;
    }
    async scoreLayerVariations(song, currentTemplate, layerAssets, layerType) {
        this.logger.debug(`Scoring ${layerAssets.length} ${layerType} variations for template: ${currentTemplate.nna_address}`);
        const scoredVariations = [];
        for (const asset of layerAssets) {
            try {
                const hypotheticalTemplate = this.substituteLayerAsset(currentTemplate, asset, layerType);
                const compatibilityScore = await this.computeCompatibilityScore(song, hypotheticalTemplate);
                const freshnessBoost = this.freshnessBoostService.calculateBoost(asset.createdAt);
                const finalScore = Math.min(compatibilityScore.base_score * freshnessBoost, 1.0);
                const layerVariation = {
                    asset_id: asset._id,
                    asset_name: asset.name,
                    nna_address: asset.nna_address,
                    compatibility_score: finalScore,
                    metadata: {
                        tags: asset.tags || [],
                        description: asset.description,
                    },
                    scoring_details: {
                        ...compatibilityScore.score_breakdown,
                        base_score: compatibilityScore.base_score,
                        freshness_boost: freshnessBoost,
                        final_score: finalScore,
                    },
                };
                scoredVariations.push(layerVariation);
            }
            catch (error) {
                this.logger.error(`Failed to score layer variation ${asset.nna_address}:`, error);
            }
        }
        this.logger.debug(`Successfully scored ${scoredVariations.length} layer variations`);
        return scoredVariations;
    }
    async getCachedScore(songId, templateId) {
        try {
            const cachedScore = await this.compatibilityScoreModel.findOne({
                song_id: songId,
                template_id: templateId,
            }).exec();
            if (cachedScore) {
                const age = Date.now() - cachedScore.computed_at.getTime();
                const maxAge = 24 * 60 * 60 * 1000;
                if (age < maxAge) {
                    return cachedScore;
                }
            }
        }
        catch (error) {
            this.logger.error('Error retrieving cached score:', error);
        }
        return null;
    }
    async computeCompatibilityScore(song, template, userPreferences) {
        const scoreBreakdown = await this.ruleBasedScoringService.computeScore(song, template, userPreferences);
        const baseScore = this.calculateWeightedScore(scoreBreakdown);
        return {
            base_score: baseScore,
            score_breakdown: scoreBreakdown,
        };
    }
    calculateWeightedScore(scoreBreakdown) {
        const weights = {
            tempo: 0.30,
            genre: 0.25,
            energy: 0.20,
            style: 0.15,
            mood: 0.10,
        };
        return (scoreBreakdown.tempo_score * weights.tempo +
            scoreBreakdown.genre_score * weights.genre +
            scoreBreakdown.energy_score * weights.energy +
            scoreBreakdown.style_score * weights.style +
            scoreBreakdown.mood_score * weights.mood);
    }
    async cacheScore(song, template, compatibilityScore) {
        try {
            const scoreDoc = new this.compatibilityScoreModel({
                song_id: song.nna_address,
                template_id: template.nna_address,
                base_score: compatibilityScore.base_score,
                freshness_boost: 1.0,
                final_score: compatibilityScore.base_score,
                score_breakdown: compatibilityScore.score_breakdown,
                song_metadata: {
                    bpm: song.songMetadata?.bpm,
                    genre: song.songMetadata?.genre,
                    energy_level: song.tags?.find((tag) => ['low-energy', 'high-energy', 'moderate-energy'].includes(tag)),
                    mood: song.tags?.find((tag) => ['happy', 'sad', 'energetic', 'calm', 'intense'].includes(tag)),
                },
                template_metadata: {
                    created_at: template.createdAt,
                    tags: template.tags || [],
                    components: template.components || [],
                },
                computed_at: new Date(),
                algorithm_version: '1.0.0',
            });
            await scoreDoc.save();
        }
        catch (error) {
            this.logger.error('Failed to cache compatibility score:', error);
        }
    }
    extractComponents(template) {
        const components = template.components || [];
        return {
            song_id: components.find((c) => c.startsWith('G.')) || '',
            star_id: components.find((c) => c.startsWith('S.')) || '',
            look_id: components.find((c) => c.startsWith('L.')) || '',
            move_id: components.find((c) => c.startsWith('M.')) || '',
            world_id: components.find((c) => c.startsWith('W.')) || '',
        };
    }
    substituteLayerAsset(originalTemplate, newAsset, layerType) {
        const layerMapping = {
            'stars': 'S',
            'looks': 'L',
            'moves': 'M',
            'worlds': 'W',
        };
        const layerCode = layerMapping[layerType];
        const newComponents = [...(originalTemplate.components || [])];
        const index = newComponents.findIndex(component => component.startsWith(layerCode));
        if (index >= 0) {
            newComponents[index] = newAsset.nna_address;
        }
        return {
            ...originalTemplate,
            components: newComponents,
            tags: [...(originalTemplate.tags || []), ...(newAsset.tags || [])],
        };
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = ScoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(compatibility_score_schema_1.CompatibilityScore.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        rule_based_scoring_service_1.RuleBasedScoringService,
        freshness_boost_service_1.FreshnessBoostService,
        diversity_service_1.DiversityService])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map