import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/arabic_numbers.dart';

class MasbahaScreen extends StatefulWidget {
  const MasbahaScreen({super.key});

  @override
  State<MasbahaScreen> createState() => _MasbahaScreenState();
}

class _MasbahaScreenState extends State<MasbahaScreen> with SingleTickerProviderStateMixin {
  int _counter = 0;
  int _totalRounds = 0;
  String _selectedPhrase = 'سبحان الله وبحمده';
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  static const List<String> _phrases = [
    'سبحان الله وبحمده',
    'سبحان الله العظيم',
    'الحمد لله',
    'لا إله إلا الله وحده لا شريك له',
    'الله أكبر',
    'أستغفر الله وأتوب إليه',
    'لا حول ولا قوة إلا بالله',
    'اللهم صلِّ وسلم على نبينا محمد',
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.94).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  void _incrementCounter() {
    HapticFeedback.lightImpact();
    _animController.forward().then((_) => _animController.reverse());
    setState(() {
      _counter++;
      if (_counter == 33 || _counter == 100) {
        HapticFeedback.mediumImpact();
      }
      if (_counter >= 100) {
        _counter = 0;
        _totalRounds++;
      }
    });
  }

  void _reset() {
    HapticFeedback.mediumImpact();
    setState(() {
      _counter = 0;
      _totalRounds = 0;
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('السبحة الإلكترونية'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'تصفير العداد',
            onPressed: _reset,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            // Phrase selector dropdown
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCard : AppColors.lightCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedPhrase,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.primary),
                    dropdownColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                    items: _phrases.map((phrase) {
                      return DropdownMenuItem(
                        value: phrase,
                        child: Text(phrase),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedPhrase = val;
                          _counter = 0;
                        });
                      }
                    },
                  ),
                ),
              ),
            ),
            const Spacer(),

            // Phrase Display
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                _selectedPhrase,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'الدورات المكتملة: ${ArabicNumbers.convert(_totalRounds)}',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 30),

            // Big Interactive Circular Button
            Center(
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: GestureDetector(
                  onTap: _incrementCounter,
                  child: Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.secondary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 28,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            ArabicNumbers.convert(_counter),
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 54,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const Text(
                            'تسبيحة',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            const Spacer(),
            Text(
              'المس الدائرة للتسبيح • يهتز الهاتف مع كل تسبيحة',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
