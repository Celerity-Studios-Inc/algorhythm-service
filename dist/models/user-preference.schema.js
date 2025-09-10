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
exports.UserPreferenceSchema = exports.UserPreference = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let UserPreference = class UserPreference extends mongoose_2.Document {
};
exports.UserPreference = UserPreference;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], UserPreference.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], UserPreference.prototype, "preferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], UserPreference.prototype, "behavior_patterns", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], UserPreference.prototype, "last_updated", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], UserPreference.prototype, "total_recommendations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], UserPreference.prototype, "total_selections", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], UserPreference.prototype, "total_completions", void 0);
exports.UserPreference = UserPreference = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], UserPreference);
exports.UserPreferenceSchema = mongoose_1.SchemaFactory.createForClass(UserPreference);
//# sourceMappingURL=user-preference.schema.js.map