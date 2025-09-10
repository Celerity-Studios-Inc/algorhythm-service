import { ScoringService } from '../scoring/scoring.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
export declare class SeedingService {
    private readonly scoringService;
    private readonly nnaRegistryService;
    private readonly logger;
    constructor(scoringService: ScoringService, nnaRegistryService: NnaRegistryService);
    seedCompatibilityScores(): Promise<void>;
    warmupCache(): Promise<void>;
}
