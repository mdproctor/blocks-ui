package io.casehub.intellij

import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.application.ApplicationManager
import kotlinx.serialization.json.Json
import java.awt.Color
import javax.swing.UIManager

object DiagramThemeSync {

    private val CSS_MAPPINGS = mapOf(
        "Panel.background" to "--pages-surface-color",
        "Label.foreground" to "--pages-text-color",
        "Component.borderColor" to "--pages-border-color",
        "Component.focusColor" to "--pages-accent-color",
        "Label.disabledForeground" to "--pages-muted-color",
        "Tree.background" to "--pages-panel-bg",
        "Table.stripeColor" to "--pages-stripe-color",
        "Actions.Red" to "--pages-error-color",
        "Actions.Yellow" to "--pages-warning-color",
        "Actions.Green" to "--pages-success-color",
    )

    fun buildThemeCss(): String {
        val lines = CSS_MAPPINGS.mapNotNull { (uiKey, cssVar) ->
            val color = UIManager.getColor(uiKey) ?: return@mapNotNull null
            "$cssVar: ${toHex(color)};"
        }
        return ":root { ${lines.joinToString(" ")} }"
    }

    fun buildThemeInjectionJs(): String {
        val css = buildThemeCss()
        val encoded = Json.encodeToString(css)
        return "window.updateTheme($encoded)"
    }

    fun installListener(panel: CaseHubDiagramPanel) {
        ApplicationManager.getApplication()
            .messageBus.connect(panel)
            .subscribe(LafManagerListener.TOPIC, LafManagerListener { panel.pushTheme() })
    }

    private fun toHex(c: Color): String =
        "#%02x%02x%02x".format(c.red, c.green, c.blue)
}
