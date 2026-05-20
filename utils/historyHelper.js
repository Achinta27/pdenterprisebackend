const mongoose = require("mongoose");

const FIELDS_TO_SKIP = ["service_images", "TAT", "changedBy", "history"];

const formatValueAsync = async (value, field) => {
  if (value === null || value === undefined || value === "") return null;

  if (field === "engineer") {
    if (typeof value === "object" && value !== null) {
      if (value.engineername) return value.engineername;
      if (value._id) value = value._id;
    }
    if (mongoose.Types.ObjectId.isValid(value)) {
      try {
        const Engineer = mongoose.model("EngineerName");
        const doc = await Engineer.findById(value).lean();
        return doc ? doc.engineername : String(value);
      } catch (err) {
        console.error("Error finding engineer in historyHelper:", err);
      }
    }
    return String(value);
  }

  if (field === "dealer") {
    if (typeof value === "object" && value !== null) {
      if (value.name) return value.dealerCode ? `${value.name} (${value.dealerCode})` : value.name;
      if (value._id) value = value._id;
    }
    if (mongoose.Types.ObjectId.isValid(value)) {
      try {
        const Dealer = mongoose.model("Dealer");
        const doc = await Dealer.findById(value).lean();
        return doc ? `${doc.name} (${doc.dealerCode})` : String(value);
      } catch (err) {
        console.error("Error finding dealer in historyHelper:", err);
      }
    }
    return String(value);
  }

  if (value instanceof Date) return value.toISOString();

  return String(value);
};

const buildHistoryEntry = async (oldDoc, updateData, changedBy) => {
  const changes = [];

  for (const [field, newValue] of Object.entries(updateData)) {
    if (FIELDS_TO_SKIP.includes(field)) continue;

    const oldValue = oldDoc.get ? oldDoc.get(field) : oldDoc[field];

    const oldFormatted = await formatValueAsync(oldValue, field);
    const newFormatted = await formatValueAsync(newValue, field);

    if (oldFormatted !== newFormatted) {
      changes.push({
        field,
        oldValue: oldFormatted,
        newValue: newFormatted,
      });
    }
  }

  if (changes.length === 0) return null;

  return {
    changedBy: {
      name: changedBy?.name || "Unknown",
      role: changedBy?.role || "unknown",
      userId: changedBy?.userId || null,
    },
    changedAt: new Date(),
    changes,
  };
};

module.exports = { buildHistoryEntry };
