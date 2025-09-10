"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RuleBasedScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleBasedScoringService = void 0;
const common_1 = require("@nestjs/common");
let RuleBasedScoringService = RuleBasedScoringService_1 = class RuleBasedScoringService {
    constructor() {
        this.logger = new common_1.Logger(RuleBasedScoringService_1.name);
    }
    async computeScore(song, template, userPreferences) {
        const tempoScore = this.computeTempoCompatibility(song, template);
        const genreScore = this.computeGenreCompatibility(song, template);
        const energyScore = this.computeEnergyCompatibility(song, template);
        const styleScore = this.computeStyleCompatibility(song, template);
        const moodScore = this.computeMoodCompatibility(song, template);
        const adjustedScores = this.applyUserPreferences({
            tempo_score: tempoScore,
            genre_score: genreScore,
            energy_score: energyScore,
            style_score: styleScore,
            mood_score: moodScore,
        }, userPreferences);
        return adjustedScores;
    }
    computeTempoCompatibility(song, template) {
        const songBPM = song.songMetadata?.bpm;
        if (!songBPM)
            return 0.5;
        const templateTags = template.tags || [];
        const bpmHints = templateTags.filter((tag) => tag.includes('bpm') || tag.includes('tempo'));
        if (bpmHints.length === 0)
            return 0.5;
        let maxCompatibility = 0;
        for (const hint of bpmHints) {
            const bpmMatch = hint.match(/(\d+)bpm/);
            if (bpmMatch) {
                const templateBPM = parseInt(bpmMatch[1]);
                const difference = Math.abs(songBPM - templateBPM);
                const compatibility = Math.max(0, 1 - (difference / 60));
                maxCompatibility = Math.max(maxCompatibility, compatibility);
            }
        }
        return maxCompatibility || 0.5;
    }
    computeGenreCompatibility(song, template) {
        const songGenre = song.songMetadata?.genre?.toLowerCase();
        if (!songGenre)
            return 0.5;
        const templateTags = (template.tags || []).map((tag) => tag.toLowerCase());
        if (templateTags.includes(songGenre))
            return 1.0;
        const genreFamilies = {
            'pop': ['electronic', 'dance', 'synth'],
            'rock': ['alternative', 'indie', 'punk'],
            'hip-hop': ['rap', 'urban', 'r&b'],
            'electronic': ['edm', 'techno', 'house', 'dance'],
            'jazz': ['blues', 'soul', 'funk'],
            'classical': ['orchestral', 'symphonic'],
        };
        const relatedGenres = genreFamilies[songGenre] || [];
        for (const relatedGenre of relatedGenres) {
            if (templateTags.includes(relatedGenre))
                return 0.7;
        }
        return 0.3;
    }
    computeEnergyCompatibility(song, template) {
        const songTags = (song.tags || []).map((tag) => tag.toLowerCase());
        const templateTags = (template.tags || []).map((tag) => tag.toLowerCase());
        const energyLevels = ['low-energy', 'moderate-energy', 'high-energy'];
        const songEnergy = songTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';
        const templateEnergy = templateTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';
        if (songEnergy === templateEnergy)
            return 1.0;
        const energyMap = { 'low-energy': 0, 'moderate-energy': 1, 'high-energy': 2 };
        const songLevel = energyMap[songEnergy];
        const templateLevel = energyMap[templateEnergy];
        const difference = Math.abs(songLevel - templateLevel);
        return difference === 1 ? 0.6 : 0.2;
    }
    computeStyleCompatibility(song, template) {
        const songTags = (song.tags || []).map((tag) => tag.toLowerCase());
        const templateTags = (template.tags || []).map((tag) => tag.toLowerCase());
        const styleKeywords = [
            'modern', 'vintage', 'retro', 'futuristic', 'minimalist', 'colorful',
            'dark', 'bright', 'abstract', 'realistic', 'artistic', 'commercial'
        ];
        const songStyles = songTags.filter(tag => styleKeywords.includes(tag));
        const templateStyles = templateTags.filter(tag => styleKeywords.includes(tag));
        if (songStyles.length === 0 || templateStyles.length === 0)
            return 0.5;
        const intersection = songStyles.filter(style => templateStyles.includes(style));
        const union = [...new Set([...songStyles, ...templateStyles])];
        return intersection.length / union.length;
    }
    computeMoodCompatibility(song, template) {
        const songTags = (song.tags || []).map((tag) => tag.toLowerCase());
        const templateTags = (template.tags || []).map((tag) => tag.toLowerCase());
        const moodKeywords = [
            'happy', 'sad', 'energetic', 'calm', 'intense', 'peaceful',
            'aggressive', 'romantic', 'mysterious', 'uplifting', 'dramatic'
        ];
        const songMoods = songTags.filter(tag => moodKeywords.includes(tag));
        const templateMoods = templateTags.filter(tag => moodKeywords.includes(tag));
        if (songMoods.length === 0 || templateMoods.length === 0)
            return 0.5;
        const intersection = songMoods.filter(mood => templateMoods.includes(mood));
        return intersection.length > 0 ? intersection.length / Math.max(songMoods.length, templateMoods.length) : 0.3;
    }
    applyUserPreferences(scores, userPreferences) {
        if (!userPreferences)
            return scores;
        const adjustedScores = { ...scores };
        if (userPreferences.energy_preference) {
            const energyBoost = userPreferences.energy_preference === 'high' ? 1.1 :
                userPreferences.energy_preference === 'low' ? 0.9 : 1.0;
            adjustedScores.energy_score *= energyBoost;
        }
        if (userPreferences.genre_preferences && userPreferences.genre_preferences.length > 0) {
            adjustedScores.genre_score *= 1.05;
        }
        Object.keys(adjustedScores).forEach(key => {
            adjustedScores[key] = Math.max(0, Math.min(1, adjustedScores[key]));
        });
        return adjustedScores;
    }
};
exports.RuleBasedScoringService = RuleBasedScoringService;
exports.RuleBasedScoringService = RuleBasedScoringService = RuleBasedScoringService_1 = __decorate([
    (0, common_1.Injectable)()
], RuleBasedScoringService);
//# sourceMappingURL=rule-based-scoring.service.js.map