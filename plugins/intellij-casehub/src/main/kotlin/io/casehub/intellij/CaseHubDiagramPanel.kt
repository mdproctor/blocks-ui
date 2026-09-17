package io.casehub.intellij

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import kotlinx.serialization.json.Json
import java.awt.BorderLayout
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

class CaseHubDiagramPanel(parent: Disposable) : JPanel(BorderLayout()), Disposable {

    private var browser: JBCefBrowser? = null

    init {
        Disposer.register(parent, this)

        if (!JBCefApp.isSupported()) {
            add(
                JLabel(
                    "Visual diagram requires a local IDE (not available in Remote Development).",
                    SwingConstants.CENTER,
                ),
                BorderLayout.CENTER,
            )
        } else {
            val targetDir = extractDiagramResources()
            val htmlFile = targetDir.resolve("diagram-shell.html")
            val cefBrowser = JBCefBrowser(htmlFile.toUri().toString())
            browser = cefBrowser
            add(cefBrowser.component, BorderLayout.CENTER)
            Disposer.register(this, cefBrowser)
        }
    }

    fun pushYaml(yaml: String, format: String) {
        val b = browser ?: return
        val encodedYaml = Json.encodeToString(yaml)
        val encodedFormat = Json.encodeToString(format)
        b.cefBrowser.executeJavaScript(
            "window.updateYaml($encodedYaml, $encodedFormat)",
            "",
            0,
        )
    }

    fun pushTheme() {
        val b = browser ?: return
        b.cefBrowser.executeJavaScript(DiagramThemeSync.buildThemeInjectionJs(), "", 0)
    }

    private fun extractDiagramResources(): Path {
        val targetDir = Path.of(System.getProperty("java.io.tmpdir"), "casehub-diagram")
        Files.createDirectories(targetDir)

        for (name in listOf("diagram-shell.html", "diagram-panel.bundle.js", "diagram-panel.bundle.js.map")) {
            val resource = javaClass.getResourceAsStream("/diagram/$name") ?: continue
            resource.use { input ->
                Files.copy(input, targetDir.resolve(name), StandardCopyOption.REPLACE_EXISTING)
            }
        }
        return targetDir
    }

    override fun dispose() {
        browser = null
    }
}
