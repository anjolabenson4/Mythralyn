import { describe, it, expect, beforeEach } from 'vitest';

type Hero = {
  id: number;
  owner: string;
  metadata: {
    name: string;
    class: string;
    level: number;
    xp: number;
    uri: string;
  };
};

let nextId: number;
let heroes: Map<number, Hero>;
let approvals: Map<number, string>;

beforeEach(() => {
  nextId = 0;
  heroes = new Map();
  approvals = new Map();
});

const mintHero = (recipient: string, name: string, heroClass: string, uri: string): number => {
  const id = nextId++;
  heroes.set(id, {
    id,
    owner: recipient,
    metadata: {
      name,
      class: heroClass,
      level: 1,
      xp: 0,
      uri,
    },
  });
  return id;
};

const transfer = (id: number, sender: string, recipient: string): boolean => {
  const hero = heroes.get(id);
  if (!hero) throw new Error('ERR_NOT_FOUND');
  if (hero.owner !== sender) throw new Error('ERR_UNAUTHORIZED');
  hero.owner = recipient;
  return true;
};

const approve = (id: number, owner: string, to: string): boolean => {
  const hero = heroes.get(id);
  if (!hero) throw new Error('ERR_NOT_FOUND');
  if (hero.owner !== owner) throw new Error('ERR_UNAUTHORIZED');
  approvals.set(id, to);
  return true;
};

const transferFrom = (id: number, sender: string, from: string, to: string): boolean => {
  const hero = heroes.get(id);
  const approved = approvals.get(id);
  if (!hero) throw new Error('ERR_NOT_FOUND');
  if (approved !== sender) throw new Error('ERR_UNAUTHORIZED');
  if (hero.owner !== from) throw new Error('ERR_UNAUTHORIZED');
  hero.owner = to;
  approvals.delete(id);
  return true;
};

const addXp = (id: number, amount: number): number => {
  const hero = heroes.get(id);
  if (!hero) throw new Error('ERR_NOT_FOUND');
  hero.metadata.xp += amount;
  return hero.metadata.xp;
};

const levelUp = (id: number, sender: string): number => {
  const hero = heroes.get(id);
  if (!hero) throw new Error('ERR_NOT_FOUND');
  if (hero.owner !== sender) throw new Error('ERR_UNAUTHORIZED');
  const xpNeeded = hero.metadata.level * 100;
  if (hero.metadata.xp < xpNeeded) throw new Error('ERR_LEVEL_CAP');
  hero.metadata.xp -= xpNeeded;
  hero.metadata.level += 1;
  return hero.metadata.level;
};

// ----------------------
// Tests
// ----------------------

describe('Hero Contract (Mocked)', () => {
  it('should mint a hero and store correct metadata', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'ipfs://auron');
    const hero = heroes.get(id);
    expect(hero).toBeDefined();
    expect(hero?.owner).toBe('alice');
    expect(hero?.metadata.name).toBe('Auron');
    expect(hero?.metadata.class).toBe('Warrior');
    expect(hero?.metadata.level).toBe(1);
  });

  it('should allow transfer by owner', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    const result = transfer(id, 'alice', 'bob');
    expect(result).toBe(true);
    expect(heroes.get(id)?.owner).toBe('bob');
  });

  it('should not allow transfer by non-owner', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    expect(() => transfer(id, 'bob', 'charlie')).toThrowError('ERR_UNAUTHORIZED');
  });

  it('should approve another address to transfer', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    const result = approve(id, 'alice', 'bob');
    expect(result).toBe(true);
    expect(approvals.get(id)).toBe('bob');
  });

  it('should not allow approve from non-owner', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    expect(() => approve(id, 'bob', 'charlie')).toThrowError('ERR_UNAUTHORIZED');
  });

  it('should allow approved address to transferFrom', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    approve(id, 'alice', 'bob');
    const result = transferFrom(id, 'bob', 'alice', 'carol');
    expect(result).toBe(true);
    expect(heroes.get(id)?.owner).toBe('carol');
  });

  it('should add XP to a hero', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    const xp = addXp(id, 150);
    expect(xp).toBe(150);
    expect(heroes.get(id)?.metadata.xp).toBe(150);
  });

  it('should level up a hero if XP is enough', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    addXp(id, 200); // Enough to level up twice
    const level = levelUp(id, 'alice');
    expect(level).toBe(2);
    expect(heroes.get(id)?.metadata.xp).toBe(100);
  });

  it('should not level up if XP is insufficient', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    addXp(id, 50);
    expect(() => levelUp(id, 'alice')).toThrowError('ERR_LEVEL_CAP');
  });

  it('should not level up if sender is not owner', () => {
    const id = mintHero('alice', 'Auron', 'Warrior', 'uri');
    addXp(id, 100);
    expect(() => levelUp(id, 'bob')).toThrowError('ERR_UNAUTHORIZED');
  });
});
