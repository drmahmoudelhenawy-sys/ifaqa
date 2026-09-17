class ArabicNumbers {
  static const Map<String, String> _digits = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩',
  };

  static String convert(dynamic number) {
    if (number == null) return '';
    final str = number.toString();
    return str.split('').map((char) => _digits[char] ?? char).join('');
  }
}
