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
exports.RecommendationCacheSchema = exports.RecommendationCache = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let RecommendationCache = class RecommendationCache extends mongoose_2.Document {
};
exports.RecommendationCache = RecommendationCache;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RecommendationCache.prototype, "song_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RecommendationCache.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RecommendationCache.prototype, "recommended_template_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RecommendationCache.prototype, "alternatives", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 1 }),
    __metadata("design:type", Number)
], RecommendationCache.prototype, "compatibility_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], RecommendationCache.prototype, "user_context", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, expires: '7d' }),
    __metadata("design:type", Date)
], RecommendationCache.prototype, "created_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], RecommendationCache.prototype, "was_selected", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RecommendationCache.prototype, "selected_at", void 0);
exports.RecommendationCache = RecommendationCache = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RecommendationCache);
exports.RecommendationCacheSchema = mongoose_1.SchemaFactory.createForClass(RecommendationCache);
exports.RecommendationCacheSchema.index({ song_id: 1, user_id: 1, created_at: -1 });
exports.RecommendationCacheSchema.index({ recommended_template_id: 1, was_selected: 1 });
//# sourceMappingURL=recommendation-cache.schema.js.map