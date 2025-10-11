export class CompositeCreatedEvent {
  constructor(
    public readonly composite: any,
    public readonly components: any[],
    public readonly timestamp: Date = new Date()
  ) {}

  get eventType(): string {
    return 'composite.created';
  }

  get compositeId(): string {
    return this.composite._id || this.composite.id;
  }

  get layer(): string {
    return this.composite.layer;
  }

  get category(): string {
    return this.composite.category;
  }

  get subcategory(): string {
    return this.composite.subcategory;
  }

  get name(): string {
    return this.composite.name;
  }

  get gcpStorageUrl(): string {
    return this.composite.gcpStorageUrl;
  }

  get compositeType(): string {
    return this.composite.compositeType || 'Full_Composite';
  }

  get componentCount(): number {
    return this.components.length;
  }

  get componentLayers(): string[] {
    return this.components.map(component => component.layer).filter(Boolean);
  }

  get componentIds(): string[] {
    return this.components.map(component => component._id || component.id).filter(Boolean);
  }

  get metadata(): any {
    return {
      aiMetadata: this.composite.aiMetadata,
      algorhythmMetadata: this.composite.algorhythmMetadata,
      aggregatedMetadata: this.composite.aggregatedMetadata,
      tags: this.composite.tags,
      description: this.composite.description,
    };
  }

  get componentsMetadata(): any[] {
    return this.components.map(component => ({
      id: component._id || component.id,
      name: component.name,
      layer: component.layer,
      category: component.category,
      subcategory: component.subcategory,
      gcpStorageUrl: component.gcpStorageUrl,
      metadata: {
        aiMetadata: component.aiMetadata,
        songMetadata: component.songMetadata,
        starMetadata: component.starMetadata,
        tags: component.tags,
      },
    }));
  }

  toJSON(): any {
    return {
      event: this.eventType,
      compositeId: this.compositeId,
      layer: this.layer,
      category: this.category,
      subcategory: this.subcategory,
      name: this.name,
      gcpStorageUrl: this.gcpStorageUrl,
      compositeType: this.compositeType,
      componentCount: this.componentCount,
      componentLayers: this.componentLayers,
      componentIds: this.componentIds,
      metadata: this.metadata,
      components: this.componentsMetadata,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
