import { Transcript } from '../types/domain';

export interface TranscriptsRepository {
  listByUser(userId: string): Transcript[];
  get(id: string): Transcript | undefined;
  create(t: Transcript): Transcript;
  update(id: string, partial: Partial<Transcript>): Transcript | undefined;
  remove(id: string): boolean;
}

export class InMemoryTranscriptsRepository implements TranscriptsRepository {
  private store = new Map<string, Transcript>();

  listByUser(userId: string): Transcript[] {
    return Array.from(this.store.values()).filter((t) => t.userId === userId);
  }
  get(id: string): Transcript | undefined {
    return this.store.get(id);
  }
  create(t: Transcript): Transcript {
    this.store.set(t.id, t);
    return t;
  }
  update(id: string, partial: Partial<Transcript>): Transcript | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial } as Transcript;
    this.store.set(id, updated);
    return updated;
  }
  remove(id: string): boolean {
    return this.store.delete(id);
  }
}

export const transcriptsRepo: TranscriptsRepository = new InMemoryTranscriptsRepository();

