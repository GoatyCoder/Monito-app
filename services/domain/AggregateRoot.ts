export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: string;
  occurredAt: string;
  payload: TPayload;
}

export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  protected constructor(public readonly id: string, protected version: number = 1) {}

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  public incrementVersion(): void {
    this.version += 1;
  }

  public getVersion(): number {
    return this.version;
  }
}
