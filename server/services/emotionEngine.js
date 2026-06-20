function updateEmotion(relationship) {
  const { affection, trust, intimacy, anger } = relationship;

  if (anger > 70) return "angry";
  if (anger > 40) return "upset";
  if (intimacy > 70 && affection > 70) return "deeply in love";
  if (intimacy > 50) return "romantic";
  if (affection > 60) return "caring";
  if (trust > 60) return "comfortable";
  if (affection < 20 && trust < 20) return "cold";
  
  return "neutral";
}

module.exports = { updateEmotion };

