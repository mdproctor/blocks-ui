package io.casehub.intellij

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefDisplayHandlerAdapter
import org.cef.handler.CefLoadHandlerAdapter
import java.awt.BorderLayout
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

class CaseHubDiagramPanel(parent: Disposable) : JPanel(BorderLayout()), Disposable {

    private var browser: JBCefBrowser? = null
    private var pageLoaded = false
    private var pendingYaml: String? = null
    private var pendingFormat: String? = null

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

            cefBrowser.jbCefClient.addDisplayHandler(object : CefDisplayHandlerAdapter() {
                override fun onConsoleMessage(browser: CefBrowser?, level: org.cef.CefSettings.LogSeverity?, message: String?, source: String?, line: Int): Boolean {
                    val prefix = if (level == org.cef.CefSettings.LogSeverity.LOGSEVERITY_ERROR) "ERROR" else "LOG"
                    com.intellij.openapi.diagnostic.Logger.getInstance("CaseHubDiagram").info("[$prefix] $message ($source:$line)")
                    return false
                }
            }, cefBrowser.cefBrowser)

            cefBrowser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
                override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                    if (frame?.isMain == true) {
                        pageLoaded = true
                        val yaml = pendingYaml
                        val format = pendingFormat
                        if (yaml != null && format != null) {
                            pendingYaml = null
                            pendingFormat = null
                            doPushYaml(yaml, format)
                            doPushTheme()
                        }
                    }
                }
            }, cefBrowser.cefBrowser)

            add(cefBrowser.component, BorderLayout.CENTER)
            Disposer.register(this, cefBrowser)
        }
    }

    fun pushYaml(yaml: String, format: String) {
        if (!pageLoaded) {
            pendingYaml = yaml
            pendingFormat = format
            return
        }
        doPushYaml(yaml, format)
    }

    private fun doPushYaml(yaml: String, format: String) {
        val b = browser ?: return
        val encodedYaml = Json.encodeToString<String>(yaml)
        val encodedFormat = Json.encodeToString<String>(format)
        b.cefBrowser.executeJavaScript(
            "window.updateYaml($encodedYaml, $encodedFormat)",
            "",
            0,
        )
    }

    fun pushTheme() {
        if (!pageLoaded) return
        doPushTheme()
    }

    private fun doPushTheme() {
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
