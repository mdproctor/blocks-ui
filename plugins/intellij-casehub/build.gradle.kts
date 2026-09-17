plugins {
    id("org.jetbrains.kotlin.jvm") version "2.1.21"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.21"
    id("org.jetbrains.intellij.platform")
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    intellijPlatform {
        intellijIdeaCommunity(providers.gradleProperty("platformVersion").get())
        plugin("com.redhat.devtools.lsp4ij", providers.gradleProperty("lsp4ijVersion").get())
        bundledPlugin("org.jetbrains.plugins.yaml")
    }
}

kotlin {
    jvmToolchain(21)
}

intellijPlatform {
    pluginConfiguration {
        id = "io.casehub.yaml"
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")
        ideaVersion {
            sinceBuild = "242"
        }
    }

    pluginVerification {
        ides {
            recommended()
        }
    }
}

val copyServerBundle = tasks.register<Copy>("copyServerBundle") {
    from("../../packages/lsp-schemas/dist/server-node.bundle.cjs")
    into(layout.buildDirectory.dir("resources/main/server"))
}

val copyDiagramBundle = tasks.register<Copy>("copyDiagramBundle") {
    from("../../packages/lsp-schemas/dist/diagram-panel.bundle.js")
    from("../../packages/lsp-schemas/dist/diagram-panel.bundle.js.map")
    from("../../packages/lsp-schemas/src/diagram-shell.html")
    into(layout.buildDirectory.dir("resources/main/diagram"))
}

tasks.named("processResources") {
    dependsOn(copyServerBundle)
    dependsOn(copyDiagramBundle)
}
