import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class CreditItem {
  final String title;
  final String description;
  final String license;
  final String link;

  const CreditItem({
    required this.title,
    required this.description,
    required this.license,
    required this.link,
  });
}

class CreditsScreen extends StatelessWidget {
  const CreditsScreen({super.key});

  static const List<CreditItem> credits = [
    CreditItem(
      title: 'نص القرآن الكريم وخطوط المصحف',
      description: 'رسم المصحف الشريف وخطوط الصفحات (QCF) عبر حزمة qcf_quran_plus، وأصلها من مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة.',
      license: 'حزمة qcf_quran_plus برخصة MIT — والخطوط تخضع لشروط المجمع.',
      link: 'https://github.com/hussein12347/qcf_quran_plus',
    ),
    CreditItem(
      title: 'إذاعات القرآن الكريم',
      description: 'بث مباشر لإذاعات كبار القراء، التفسير، والقراءات العشر.',
      license: 'روابط بث عامة يتناقلها موقع Qurango و MP3Quran — الحقوق لأصحابها.',
      link: 'https://qurango.net',
    ),
    CreditItem(
      title: 'تلاوات الآيات آية آية',
      description: 'تلاوة الآيات بصوت مشاهير القراء للمتابعة والحفظ.',
      license: 'مصدر مجاني وقفي للتلاوات — الحقوق لأصحابها.',
      link: 'https://everyayah.com',
    ),
    CreditItem(
      title: 'مواقيت الصلاة واتجاه القبلة',
      description: 'حساب مواقيت الصلاة الفلكية الدقيقة حسب موقع المستخدم وطرق الحساب المعتمدة عالمياً.',
      license: 'مكتبة Adhan المفتوحة المصدر (Batoul Apps).',
      link: 'https://github.com/batoulapps/adhan-dart',
    ),
    CreditItem(
      title: 'حصن المسلم',
      description: 'الأذكار والأدعية المأثورة عن رسول الله ﷺ في الصباح والمساء ومختلف الأحوال.',
      license: 'تأليف الشيخ د. سعيد بن علي بن وهف القحطاني رحمه الله — الحقوق لمؤلفه وناشره.',
      link: '',
    ),
    CreditItem(
      title: 'خطوط الواجهة (Cairo & Amiri)',
      description: 'خط الواجهة الرئيسي (Cairo) وخط المصحف والبسملة (Amiri).',
      license: 'رخصة الخطوط المفتوحة SIL OFL 1.1 — Google Fonts.',
      link: 'https://fonts.google.com',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('المصادر والتراخيص'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Header intro
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [const Color(0xFFF1F5F9), const Color(0xFFE2E8F0)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.verified, color: AppColors.primary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'من أين جاء كل ما في التطبيق',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'تطبيق «إفاقة» يعتمد على مصادر وجهود مشكورة لغيرنا. هذه قائمة بها وبحقوق أصحابها، إن كنت صاحب حق في أي منها ولديك ملاحظة، يسعدنا تواصلك معنا.',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    height: 1.6,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Cards list
          ...credits.map((item) => _buildCreditCard(context, item, isDark)),
        ],
      ),
    );
  }

  Widget _buildCreditCard(BuildContext context, CreditItem item, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161F30) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF223048) : AppColors.lightBorder,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            item.title,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w900,
              fontSize: 15,
              color: isDark ? Colors.white : AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          // Description
          Text(
            item.description,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              height: 1.5,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 10),
          // License row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.shield_outlined, size: 15, color: AppColors.emerald),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  item.license,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    color: AppColors.emerald,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          // Link if available
          if (item.link.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              item.link,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11,
                color: AppColors.primary.withOpacity(0.8),
                decoration: TextDecoration.underline,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
