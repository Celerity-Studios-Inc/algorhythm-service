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
exports.TemplateRecommendationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class UserPreferencesDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User energy preference',
        enum: ['low', 'moderate', 'high'],
        example: 'high'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['low', 'moderate', 'high']),
    __metadata("design:type", String)
], UserPreferencesDto.prototype, "energy_preference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User style preference',
        example: 'modern'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UserPreferencesDto.prototype, "style_preference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User genre preferences',
        example: ['pop', 'electronic']
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UserPreferencesDto.prototype, "genre_preferences", void 0);
class DeviceInfoDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device platform',
        enum: ['ios', 'android'],
        example: 'ios'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ios', 'android']),
    __metadata("design:type", String)
], DeviceInfoDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'App version',
        example: '1.2.3'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeviceInfoDto.prototype, "version", void 0);
class UserContextDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID',
        example: 'user_12345'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UserContextDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User preferences',
        type: UserPreferencesDto
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => UserPreferencesDto),
    __metadata("design:type", UserPreferencesDto)
], UserContextDto.prototype, "preferences", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device information',
        type: DeviceInfoDto
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DeviceInfoDto),
    __metadata("design:type", DeviceInfoDto)
], UserContextDto.prototype, "device_info", void 0);
class TemplateRecommendationDto {
    constructor() {
        this.max_alternatives = 5;
        this.include_scoring_details = false;
    }
}
exports.TemplateRecommendationDto = TemplateRecommendationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Song ID in NNA format',
        example: 'G.POP.TEN.001'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TemplateRecommendationDto.prototype, "song_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User context for personalization',
        type: UserContextDto
    }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => UserContextDto),
    __metadata("design:type", UserContextDto)
], TemplateRecommendationDto.prototype, "user_context", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum number of alternative recommendations',
        minimum: 1,
        maximum: 20,
        default: 5,
        example: 5
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    __metadata("design:type", Number)
], TemplateRecommendationDto.prototype, "max_alternatives", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Include detailed scoring information',
        default: false,
        example: false
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], TemplateRecommendationDto.prototype, "include_scoring_details", void 0);
//# sourceMappingURL=template-recommendation.dto.js.map