export class AssetCreatedEvent {
  constructor(
    public readonly asset: any,
    public readonly timestamp: Date = new Date()
  ) {}

  get eventType(): string {
    return 'asset.created';
  }

  get assetId(): string {
    return this.asset._id || this.asset.id;
  }

  get layer(): string {
    return this.asset.layer;
  }

  get category(): string {
    return this.asset.category;
  }

  get subcategory(): string {
    return this.asset.subcategory;
  }

  get name(): string {
    return this.asset.name;
  }

  get gcpStorageUrl(): string {
    return this.asset.gcpStorageUrl;
  }

  get metadata(): any {
    return {
      aiMetadata: this.asset.aiMetadata,
      songMetadata: this.asset.songMetadata,
      starMetadata: this.asset.starMetadata,
      tags: this.asset.tags,
      description: this.asset.description,
    };
  }

  toJSON(): any {
    return {
      event: this.eventType,
      assetId: this.assetId,
      layer: this.layer,
      category: this.category,
      subcategory: this.subcategory,
      name: this.name,
      gcpStorageUrl: this.gcpStorageUrl,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
