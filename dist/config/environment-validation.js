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
exports.EnvironmentValidationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EnvironmentValidationService = class EnvironmentValidationService {
    constructor(configService) {
        this.configService = configService;
    }
    validateEnvironment() {
        const isCloudRun = process.env.K_SERVICE || process.env.PORT;
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isCloudRun && !isDevelopment) {
            console.log('☁️ Cloud Run environment detected - skipping strict validation');
            return;
        }
        const requiredVars = [
            'MONGODB_URI',
            'REDIS_URL',
            'JWT_SECRET',
            'NNA_REGISTRY_BASE_URL',
            'NODE_ENV',
        ];
        const missingVars = requiredVars.filter(varName => !this.configService.get(varName));
        if (missingVars.length > 0) {
            console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
            console.warn('⚠️ Service will start with limited functionality');
        }
        else {
            console.log('✅ Environment validation passed');
        }
    }
};
exports.EnvironmentValidationService = EnvironmentValidationService;
exports.EnvironmentValidationService = EnvironmentValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EnvironmentValidationService);
//# sourceMappingURL=environment-validation.js.map