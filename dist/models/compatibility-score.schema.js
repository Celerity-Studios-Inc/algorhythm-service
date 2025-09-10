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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompatibilityScoreSchema = exports.CompatibilityScore = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let CompatibilityScore = class CompatibilityScore extends mongoose_2.Document {
};
exports.CompatibilityScore = CompatibilityScore;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CompatibilityScore.prototype, "song_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CompatibilityScore.prototype, "template_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 1 }),
    __metadata("design:type", Number)
], CompatibilityScore.prototype, "base_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 2 }),
    __metadata("design:type", Number)
], CompatibilityScore.prototype, "freshness_boost", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 2 }),
    __metadata("design:type", Number)
], CompatibilityScore.prototype, "final_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], CompatibilityScore.prototype, "score_breakdown", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], CompatibilityScore.prototype, "song_metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], CompatibilityScore.prototype, "template_metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, expires: '30d' }),
    __metadata("design:type", Date)
], CompatibilityScore.prototype, "computed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '1.0.0' }),
    __metadata("design:type", String)
], CompatibilityScore.prototype, "algorithm_version", void 0);
exports.CompatibilityScore = CompatibilityScore = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CompatibilityScore);
exports.CompatibilityScoreSchema = mongoose_1.SchemaFactory.createForClass(CompatibilityScore);
exports.CompatibilityScoreSchema.index({ song_id: 1, template_id: 1 }, { unique: true });
exports.CompatibilityScoreSchema.index({ song_id: 1, final_score: -1 });
exports.CompatibilityScoreSchema.index({ computed_at: 1 });
//# sourceMappingURL=compatibility-score.schema.js.map