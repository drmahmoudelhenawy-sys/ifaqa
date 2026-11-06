class Tier {
  final String id;
  final String name;
  final int min;
  final int max;
  final String img;

  const Tier({required this.id, required this.name, required this.min, required this.max, required this.img});
}

const List<Tier> kTiers = [
  Tier(id: 'bronze', name: 'مبتدئ', min: 0, max: 49999, img: 'assets/images/tier-bronze.png'),
  Tier(id: 'silver', name: 'مواظب', min: 50000, max: 149999, img: 'assets/images/tier-silver.png'),
  Tier(id: 'gold', name: 'سابق', min: 150000, max: 449999, img: 'assets/images/tier-gold.png'),
  Tier(id: 'diamond', name: 'خاشع', min: 450000, max: 1349999, img: 'assets/images/tier-diamond.png'),
  Tier(id: 'legendary', name: 'أسطوري', min: 1350000, max: 2999999, img: 'assets/images/tier-legendary.png'),
  Tier(id: 'elite', name: 'النخبة', min: 3000000, max: 9999999999, img: 'assets/images/tier-elite.png'),
];

Tier getTierForXp(int xp) {
  final safeXp = xp < 0 ? 0 : xp;
  return kTiers.firstWhere(
    (t) => safeXp >= t.min && safeXp <= t.max,
    orElse: () => kTiers.last,
  );
}

Tier getNextTier(Tier current) {
  final index = kTiers.indexWhere((t) => t.id == current.id);
  if (index == -1 || index + 1 >= kTiers.length) return kTiers.last;
  return kTiers[index + 1];
}
