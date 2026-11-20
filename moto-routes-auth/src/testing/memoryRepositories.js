import { randomBytes } from "node:crypto";

/*
 * Los repositorios en memoria para los tests: el mismo contrato que src/repositories/index.js,
 * sin MongoDB. Lo que hace atómico Mongo (gastar un refresh) aquí lo es porque JS es de un hilo.
 */
const newId = () => randomBytes(12).toString("hex");
const copy = (value) => (value ? structuredClone(value) : null);

export function createMemoryRepositories() {
  const db = { users: [], roles: [], profiles: [], sessions: [], revoked: [] };

  const roleOf = (user) => {
    const role = db.roles.find((r) => r._id === user.roleId && !r.deletedAt);
    return role ? { name: role.name, isActive: role.isActive } : null;
  };
  const aliveUser = (predicate) => db.users.find((u) => !u.deletedAt && predicate(u));
  const withRole = (user, extra = []) => {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return copy({ ...rest, ...(extra.includes("passwordHash") && { passwordHash }), role: roleOf(user) });
  };

  const repositories = {
    users: {
      async findForLogin(email) {
        return withRole(aliveUser((u) => u.email === email), ["passwordHash"]);
      },
      async findAuthById(id) {
        return withRole(aliveUser((u) => u._id === String(id)));
      },
      async findPasswordHash(id) {
        const user = aliveUser((u) => u._id === String(id));
        return user ? { _id: user._id, passwordHash: user.passwordHash } : null;
      },
      async emailTaken(email) {
        return db.users.some((u) => u.email === email);
      },
      async create({ name, email, passwordHash, roleId }) {
        const user = { _id: newId(), name, email, passwordHash, roleId, tokenVersion: 0, isActive: true, deletedAt: null };
        db.users.push(user);
        return { _id: user._id };
      },
      async deleteCreated(id) {
        db.users = db.users.filter((u) => u._id !== String(id));
      },
      async updatePasswordHash(id, passwordHash) {
        const user = aliveUser((u) => u._id === String(id));
        if (user) user.passwordHash = passwordHash;
      },
      async bumpTokenVersion(id) {
        const user = db.users.find((u) => u._id === String(id));
        if (user) user.tokenVersion += 1;
      },
    },
    roles: {
      async findActiveByName(name) {
        return copy(db.roles.find((r) => r.name === name && r.isActive && !r.deletedAt));
      },
    },
    profiles: {
      async createEmpty(userId) {
        db.profiles.push({ userId: String(userId) });
      },
    },
    sessions: {
      async create(session) {
        db.sessions.push({ ...session, userId: String(session.userId), usedAt: null });
      },
      async consume(tokenHash, now) {
        const session = db.sessions.find((s) => s.tokenHash === tokenHash && !s.usedAt && s.expiresAt > now);
        if (!session) return null;
        session.usedAt = now;
        return copy(session);
      },
      async findByHash(tokenHash) {
        return copy(db.sessions.find((s) => s.tokenHash === tokenHash));
      },
      async deleteFamily(familyId) {
        db.sessions = db.sessions.filter((s) => s.familyId !== familyId);
      },
      async deleteByUser(userId) {
        db.sessions = db.sessions.filter((s) => s.userId !== String(userId));
      },
    },
    revokedTokens: {
      async isRevoked(jti) {
        return db.revoked.some((r) => r.jti === jti);
      },
      async revoke(entry) {
        if (!db.revoked.some((r) => r.jti === entry.jti)) db.revoked.push(entry);
      },
    },
  };

  // Para preparar datos y mirar el estado desde los tests
  const seed = {
    role(name, { isActive = true } = {}) {
      const role = { _id: newId(), name, isActive, deletedAt: null };
      db.roles.push(role);
      return role;
    },
    user({ name = "Ana García", email, passwordHash, role, isActive = true }) {
      const user = { _id: newId(), name, email, passwordHash, roleId: role._id, tokenVersion: 0, isActive, deletedAt: null };
      db.users.push(user);
      return user;
    },
  };

  return { repositories, db, seed };
}
