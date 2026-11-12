// La app de Android. Dentro lleva la carpeta web del repositorio (las mismas pantallas que la versión web).
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Llave con la que se firma la app. En GitHub viene de los secretos; sin ella se usa la de pruebas.
val almacenDeLlaves: String? = System.getenv("IDEAL_LLAVES")

android {
    namespace = "com.kalleros.ideal"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kalleros.ideal"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("IDEAL_NUMERO") ?: "1").toInt()
        versionName = "1.1"
    }

    signingConfigs {
        create("propia") {
            if (almacenDeLlaves != null) {
                storeFile = file(almacenDeLlaves)
                storeType = "pkcs12"
                storePassword = System.getenv("IDEAL_LLAVES_CLAVE")
                keyAlias = "ideal"
                keyPassword = System.getenv("IDEAL_LLAVES_CLAVE")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName(if (almacenDeLlaves != null) "propia" else "debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

// Copia la carpeta web a los archivos de la app antes de compilar.
val copiarWeb by tasks.registering(Copy::class) {
    from(rootProject.file("../web"))
    into(layout.buildDirectory.dir("activos/web"))
}
android.sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("activos"))
tasks.named("preBuild") { dependsOn(copiarWeb) }

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
