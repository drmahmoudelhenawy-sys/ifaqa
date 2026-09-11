# Add project specific ProGuard rules here.

-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}

# Keep JavaScript Interfaces
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebViews and Native Plugins
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Keep Data Models & Firebase
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

-keepattributes SourceFile,LineNumberTable
