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
exports.LayerVariationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class LayerVariationDto {
    constructor() {
        this.limit = 8;
        this.include_scoring_details = false;
    }
}
exports.LayerVariationDto = LayerVariationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current template ID',
        example: 'C.001.001.001'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LayerVariationDto.prototype, "current_template_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Layer to vary',
        enum: ['stars', 'looks', 'moves', 'worlds'],
        example: 'stars'
    }),
    (0, class_validator_1.IsEnum)(['stars', 'looks', 'moves', 'worlds']),
    __metadata("design:type", String)
], LayerVariationDto.prototype, "vary_layer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Song ID for compatibility scoring',
        example: 'G.POP.TEN.001'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LayerVariationDto.prototype, "song_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum number of variations to return',
        minimum: 1,
        maximum: 20,
        default: 8,
        example: 8
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    __metadata("design:type", Number)
], LayerVariationDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Include detailed scoring information',
        default: false,
        example: false
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], LayerVariationDto.prototype, "include_scoring_details", void 0);
//# sourceMappingURL=layer-variation.dto.js.map