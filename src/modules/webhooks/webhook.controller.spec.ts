import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookValidationService } from './webhook-validation.service';
import { WebhookPayloadTransformerService } from './webhook-payload-transformer.service';
import { EventProcessorService } from '../events/event-processor.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            processAssetCreated: jest.fn(),
            processAssetUpdated: jest.fn(),
            processCompositeCreated: jest.fn(),
          },
        },
        {
          provide: WebhookValidationService,
          useValue: {
            validateSignature: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: WebhookPayloadTransformerService,
          useValue: {
            transformPayload: jest.fn().mockImplementation((payload) => payload),
            validateTransformedPayload: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: EventProcessorService,
          useValue: {
            processAssetCreated: jest.fn(),
            processAssetUpdated: jest.fn(),
            processCompositeCreated: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleAssetCreated', () => {
    it('should process asset created webhook', async () => {
      const payload = {
        event: 'asset.created' as const,
        assetId: 'test-asset-id',
        layer: 'G',
        category: 'POP',
        subcategory: 'GEN',
        name: 'Test Asset',
        gcpStorageUrl: 'https://storage.googleapis.com/test.mp3',
        metadata: {
          aiMetadata: {},
          tags: ['test'],
          description: 'Test asset',
        },
        timestamp: new Date().toISOString(),
      };

      const expectedResult = {
        success: true,
        message: 'Asset created webhook processed successfully',
        assetId: 'test-asset-id',
      };

      jest.spyOn(service, 'processAssetCreated').mockResolvedValue(expectedResult);

      const result = await controller.handleAssetCreated(
        payload,
        'test-signature',
        new Date().toISOString()
      );

      expect(result).toEqual(expectedResult);
      expect(service.processAssetCreated).toHaveBeenCalledWith(
        payload,
        'test-signature',
        expect.any(String)
      );
    });
  });

  describe('handleAssetUpdated', () => {
    it('should process asset updated webhook', async () => {
      const payload = {
        event: 'asset.updated' as const,
        assetId: 'test-asset-id',
        layer: 'G',
        category: 'POP',
        subcategory: 'GEN',
        name: 'Updated Test Asset',
        gcpStorageUrl: 'https://storage.googleapis.com/test.mp3',
        metadata: {
          aiMetadata: {},
          tags: ['test', 'updated'],
          description: 'Updated test asset',
        },
        changes: {
          name: true,
          tags: true,
        },
        timestamp: new Date().toISOString(),
      };

      const expectedResult = {
        success: true,
        message: 'Asset updated webhook processed successfully',
        assetId: 'test-asset-id',
      };

      jest.spyOn(service, 'processAssetUpdated').mockResolvedValue(expectedResult);

      const result = await controller.handleAssetUpdated(
        payload,
        'test-signature',
        new Date().toISOString()
      );

      expect(result).toEqual(expectedResult);
      expect(service.processAssetUpdated).toHaveBeenCalledWith(
        payload,
        'test-signature',
        expect.any(String)
      );
    });
  });

  describe('handleCompositeCreated', () => {
    it('should process composite created webhook', async () => {
      const payload = {
        event: 'composite.created' as const,
        compositeId: 'test-composite-id',
        layer: 'C',
        category: 'FUL',
        subcategory: 'ALL',
        name: 'Test Composite',
        gcpStorageUrl: 'https://storage.googleapis.com/test-composite.mp4',
        compositeType: 'Full_Composite',
        componentCount: 2,
        componentLayers: ['G', 'S'],
        componentIds: ['song-id', 'star-id'],
        metadata: {
          aiMetadata: {},
          algorhythmMetadata: {},
          aggregatedMetadata: {},
          tags: ['composite', 'test'],
          description: 'Test composite',
        },
        components: [
          {
            id: 'song-id',
            name: 'Test Song',
            layer: 'G',
            category: 'POP',
            subcategory: 'GEN',
            gcpStorageUrl: 'https://storage.googleapis.com/song.mp3',
            metadata: {
              aiMetadata: {},
              tags: ['song'],
            },
          },
          {
            id: 'star-id',
            name: 'Test Star',
            layer: 'S',
            category: 'PER',
            subcategory: 'TEN',
            gcpStorageUrl: 'https://storage.googleapis.com/star.jpg',
            metadata: {
              aiMetadata: {},
              tags: ['star'],
            },
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const expectedResult = {
        success: true,
        message: 'Composite created webhook processed successfully',
        compositeId: 'test-composite-id',
      };

      jest.spyOn(service, 'processCompositeCreated').mockResolvedValue(expectedResult);

      const result = await controller.handleCompositeCreated(
        payload,
        'test-signature',
        new Date().toISOString()
      );

      expect(result).toEqual(expectedResult);
      expect(service.processCompositeCreated).toHaveBeenCalledWith(
        payload,
        'test-signature',
        expect.any(String)
      );
    });
  });
});
