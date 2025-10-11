export class AssetUpdatedEvent {
  constructor(
    public readonly asset: any,
    public readonly previousAsset: any,
    public readonly timestamp: Date = new Date()
  ) {}

  get eventType(): string {
    return 'asset.updated';
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

  get changes(): any {
    return {
      name: this.asset.name !== this.previousAsset.name,
      gcpStorageUrl: this.asset.gcpStorageUrl !== this.previousAsset.gcpStorageUrl,
      tags: JSON.stringify(this.asset.tags) !== JSON.stringify(this.previousAsset.tags),
      metadata: JSON.stringify(this.asset.aiMetadata) !== JSON.stringify(this.previousAsset.aiMetadata),
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
      changes: this.changes,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
