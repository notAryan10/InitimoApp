function getRelationshipLevel(relationship) {
  const { affection, intimacy, trust, anger } = relationship;

  if (anger > 60) {
    return { level: "Conflict", emoji: "💔" };
  }

  const score = affection + trust + intimacy - anger;

  if (score >= 91) return { level: "Partner", emoji: "💍" };
  if (score >= 76) return { level: "Lover", emoji: "❤️" };
  if (score >= 61) return { level: "Crush", emoji: "😊" };
  if (score >= 41) return { level: "Close Friend", emoji: "🤝" };
  if (score >= 21) return { level: "Friend", emoji: "🙂" };
  
  return { level: "Stranger", emoji: "👋" };
}

module.exports = { getRelationshipLevel };

