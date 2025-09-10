"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedingModule = void 0;
const common_1 = require("@nestjs/common");
const seeding_service_1 = require("./seeding.service");
const scoring_module_1 = require("../scoring/scoring.module");
const nna_integration_module_1 = require("../nna-integration/nna-integration.module");
let SeedingModule = class SeedingModule {
};
exports.SeedingModule = SeedingModule;
exports.SeedingModule = SeedingModule = __decorate([
    (0, common_1.Module)({
        imports: [scoring_module_1.ScoringModule, nna_integration_module_1.NnaIntegrationModule],
        providers: [seeding_service_1.SeedingService],
        exports: [seeding_service_1.SeedingService],
    })
], SeedingModule);
//# sourceMappingURL=seeding.module.js.map