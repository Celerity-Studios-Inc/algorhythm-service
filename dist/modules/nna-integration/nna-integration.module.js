"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NnaIntegrationModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const nna_registry_service_1 = require("./nna-registry.service");
const optimized_nna_registry_service_1 = require("./optimized-nna-registry.service");
const caching_module_1 = require("../caching/caching.module");
let NnaIntegrationModule = class NnaIntegrationModule {
};
exports.NnaIntegrationModule = NnaIntegrationModule;
exports.NnaIntegrationModule = NnaIntegrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 10000,
                maxRedirects: 5,
            }),
            caching_module_1.CachingModule,
        ],
        providers: [nna_registry_service_1.NnaRegistryService, optimized_nna_registry_service_1.OptimizedNnaRegistryService],
        exports: [nna_registry_service_1.NnaRegistryService, optimized_nna_registry_service_1.OptimizedNnaRegistryService],
    })
], NnaIntegrationModule);
//# sourceMappingURL=nna-integration.module.js.map