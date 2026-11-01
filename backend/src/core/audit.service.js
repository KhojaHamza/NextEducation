// Converts Dates and Decimals to plain JSON before storing
const plain = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : undefined);

export const logAudit = (tx, { userId, action, entity, entityId, oldValues, newValues }) =>
  tx.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      oldValues: plain(oldValues),
      newValues: plain(newValues),
    },
  });