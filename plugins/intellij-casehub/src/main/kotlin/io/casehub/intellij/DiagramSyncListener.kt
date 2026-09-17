package io.casehub.intellij

import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import java.util.Timer
import java.util.TimerTask

class DiagramSyncListener(
    private val panel: CaseHubDiagramPanel,
    private val format: String,
) : DocumentListener {

    @Volatile
    var suppressEcho = false

    private var debounceTimer: Timer? = null
    private val debounceMs = 150L
    var paused = false

    override fun documentChanged(event: DocumentEvent) {
        if (suppressEcho || paused) return
        scheduleYamlPush(event.document)
    }

    private fun scheduleYamlPush(document: Document) {
        debounceTimer?.cancel()
        debounceTimer = Timer("diagram-sync", true).also { timer ->
            timer.schedule(object : TimerTask() {
                override fun run() {
                    val yaml = document.text
                    panel.pushYaml(yaml, format)
                }
            }, debounceMs)
        }
    }

    fun dispose() {
        debounceTimer?.cancel()
        debounceTimer = null
    }
}
