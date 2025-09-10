import { ConfigService } from '@nestjs/config';
export declare class EnvironmentValidationService {
    private configService;
    constructor(configService: ConfigService);
    validateEnvironment(): void;
}
