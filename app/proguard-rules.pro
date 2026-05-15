# Add project specific ProGuard rules here.
# SECURITY ENHANCED: Comprehensive obfuscation and optimization

# ============================================================================
# SECURITY: Obfuscation Settings
# ============================================================================
-repackageclasses ''
-allowaccessmodification
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5

# Remove logging in production
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}

# ============================================================================
# Keep Retrofit interfaces
# ============================================================================
-keep interface com.antharjala.watch.data.remote.** { *; }

# ============================================================================
# Keep data models (needed for Gson serialization)
# ============================================================================
-keep class com.antharjala.watch.data.remote.dto.** { *; }
-keep class com.antharjala.watch.domain.model.** { *; }

# ============================================================================
# Keep Room entities
# ============================================================================
-keep class com.antharjala.watch.data.local.entity.** { *; }

# ============================================================================
# SECURITY: Obfuscate security classes but keep public API
# ============================================================================
-keep public class com.antharjala.watch.core.security.TokenManager {
    public <methods>;
}
-keep public class com.antharjala.watch.core.security.PlayIntegrityManager {
    public <methods>;
}

# ============================================================================
# Keep Hilt generated classes
# ============================================================================
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# ============================================================================
# Keep WorkManager
# ============================================================================
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.CoroutineWorker
-keep class androidx.work.impl.WorkManagerImpl { *; }

# ============================================================================
# Firebase
# ============================================================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ============================================================================
# Gson
# ============================================================================
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ============================================================================
# OkHttp & Retrofit
# ============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class retrofit2.** { *; }

# ============================================================================
# Kotlin Coroutines
# ============================================================================
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ============================================================================
# SECURITY: Remove debug information
# ============================================================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================================================
# SECURITY: Encrypt strings (requires additional plugin)
# ============================================================================
# -encryptstrings

# ============================================================================
# Keep native methods
# ============================================================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================================================
# Keep custom views
# ============================================================================
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}

# ============================================================================
# Keep Parcelable
# ============================================================================
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ============================================================================
# Keep Serializable
# ============================================================================
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# SECURITY: Additional hardening
# ============================================================================
-dontskipnonpubliclibraryclasses
-dontskipnonpubliclibraryclassmembers
-forceprocessing

