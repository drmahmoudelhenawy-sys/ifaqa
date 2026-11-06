import 'package:flutter/material.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';

/// Email sign-in and sign-up, the same accounts as the React app.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _busy = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty || (_signUp && _name.text.trim().isEmpty)) {
      setState(() => _error = 'من فضلك أكمل كل الحقول.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    final cloud = CloudService.instance;
    final error = _signUp ? await cloud.signUp(_name.text, email, password) : await cloud.signIn(email, password);
    if (!mounted) return;
    if (error == null) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _busy = false;
      _error = error;
    });
  }

  Future<void> _reset() async {
    if (_email.text.trim().isEmpty) {
      setState(() => _error = 'اكتب بريدك الإلكتروني أولًا.');
      return;
    }
    setState(() => _busy = true);
    final error = await CloudService.instance.resetPassword(_email.text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error;
      _info = error == null ? 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.' : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(backgroundColor: AppColors.slate50, elevation: 0, foregroundColor: AppColors.slate800),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          children: [
            Image.asset('assets/images/logo-colored.png', width: 96, height: 96),
            const SizedBox(height: 12),
            Text(
              _signUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.slate800),
            ),
            const SizedBox(height: 6),
            const Text(
              'نفس حسابك في إفاقة: نقاطك والمتصدرين وحائط آمين.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500),
            ),
            const SizedBox(height: 24),
            if (_signUp) ...[
              _field(_name, 'الاسم', Icons.person),
              const SizedBox(height: 12),
            ],
            _field(_email, 'البريد الإلكتروني', Icons.email, keyboard: TextInputType.emailAddress),
            const SizedBox(height: 12),
            _field(_password, 'كلمة المرور', Icons.lock, obscure: true),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.rose500, fontWeight: FontWeight.bold)),
              ),
            if (_info != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_info!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.emerald700, fontWeight: FontWeight.bold)),
              ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.violet600,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              ),
              child: Text(_busy ? 'لحظة...' : (_signUp ? 'إنشاء الحساب' : 'دخول'), style: const TextStyle(fontWeight: FontWeight.w900)),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _busy ? null : () => setState(() {
                _signUp = !_signUp;
                _error = null;
                _info = null;
              }),
              child: Text(_signUp ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ أنشئ حسابًا', style: const TextStyle(fontWeight: FontWeight.w900)),
            ),
            if (!_signUp)
              TextButton(
                onPressed: _busy ? null : _reset,
                child: const Text('نسيت كلمة المرور؟', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController controller, String label, IconData icon, {bool obscure = false, TextInputType? keyboard}) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboard,
      textDirection: keyboard == TextInputType.emailAddress || obscure ? TextDirection.ltr : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
      ),
      onSubmitted: (_) => _submit(),
    );
  }
}

/// Shown in place of features that need an account.
class SignInPrompt extends StatelessWidget {
  final String message;
  const SignInPrompt({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final available = CloudService.instance.available;
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
      child: Column(
        children: [
          const Icon(Icons.lock_person, size: 36, color: AppColors.violet600),
          const SizedBox(height: 10),
          Text(
            available ? message : 'هذه الميزة غير متاحة على هذا الجهاز بعد.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          if (available) ...[
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen())),
              style: FilledButton.styleFrom(backgroundColor: AppColors.violet600),
              child: const Text('تسجيل الدخول', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ],
      ),
    );
  }
}
