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
exports.AnalyticsEventSchema = exports.AnalyticsEvent = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AnalyticsEvent = class AnalyticsEvent extends mongoose_2.Document {
};
exports.AnalyticsEvent = AnalyticsEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "event_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "song_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "template_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "layer_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AnalyticsEvent.prototype, "event_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AnalyticsEvent.prototype, "performance_metrics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, index: true }),
    __metadata("design:type", Date)
], AnalyticsEvent.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "session_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "request_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '1.0.0' }),
    __metadata("design:type", String)
], AnalyticsEvent.prototype, "version", void 0);
exports.AnalyticsEvent = AnalyticsEvent = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AnalyticsEvent);
exports.AnalyticsEventSchema = mongoose_1.SchemaFactory.createForClass(AnalyticsEvent);
exports.AnalyticsEventSchema.index({ event_type: 1, timestamp: -1 });
exports.AnalyticsEventSchema.index({ user_id: 1, timestamp: -1 });
exports.AnalyticsEventSchema.index({ template_id: 1, event_type: 1 });
//# sourceMappingURL=analytics-event.schema.js.map