"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptsRepo = exports.InMemoryTranscriptsRepository = void 0;
class InMemoryTranscriptsRepository {
    constructor() {
        this.store = new Map();
    }
    listByUser(userId) {
        return Array.from(this.store.values()).filter((t) => t.userId === userId);
    }
    get(id) {
        return this.store.get(id);
    }
    create(t) {
        this.store.set(t.id, t);
        return t;
    }
    update(id, partial) {
        const existing = this.store.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...partial };
        this.store.set(id, updated);
        return updated;
    }
    remove(id) {
        return this.store.delete(id);
    }
}
exports.InMemoryTranscriptsRepository = InMemoryTranscriptsRepository;
exports.transcriptsRepo = new InMemoryTranscriptsRepository();
