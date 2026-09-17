package io.casehub.intellij

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview
import com.intellij.openapi.fileEditor.impl.text.TextEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefApp
import java.beans.PropertyChangeListener
import javax.swing.JComponent

class CaseHubFileEditorProvider : FileEditorProvider, DumbAware {

    override fun getEditorTypeId(): String = "casehub-yaml-diagram"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR

    override fun accept(project: Project, file: VirtualFile): Boolean {
        val name = file.name
        return name.endsWith(".case.yaml") ||
            name.endsWith(".swf.yaml") ||
            name.endsWith(".htn.yaml") ||
            name.endsWith(".org.yaml")
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        val textEditor = TextEditorProvider.getInstance().createEditor(project, file) as TextEditor

        if (!JBCefApp.isSupported()) {
            return textEditor
        }

        val format = when {
            file.name.endsWith(".case.yaml") -> "case"
            file.name.endsWith(".swf.yaml") -> "swf"
            file.name.endsWith(".htn.yaml") -> "htn"
            file.name.endsWith(".org.yaml") -> "org"
            else -> return textEditor
        }

        val diagramPanel = CaseHubDiagramPanel(textEditor)
        val syncListener = DiagramSyncListener(diagramPanel, format)

        val editor = textEditor.editor
        editor.document.addDocumentListener(syncListener)

        val splitEditor = TextEditorWithPreview(
            textEditor,
            CaseHubDiagramEditor(diagramPanel),
            "CaseHub YAML",
            TextEditorWithPreview.Layout.SHOW_EDITOR_AND_PREVIEW,
        )

        diagramPanel.pushYaml(editor.document.text, format)
        diagramPanel.pushTheme()
        DiagramThemeSync.installListener(diagramPanel)

        return splitEditor
    }
}

private class CaseHubDiagramEditor(
    private val panel: CaseHubDiagramPanel,
) : FileEditor {

    override fun getComponent(): JComponent = panel

    override fun getPreferredFocusedComponent(): JComponent = panel

    override fun getName(): String = "Diagram"

    override fun setState(state: FileEditorState) {}

    override fun isValid(): Boolean = true

    override fun isModified(): Boolean = false

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun dispose() {}

    private val userData = com.intellij.openapi.util.UserDataHolderBase()
    override fun <T : Any?> getUserData(key: Key<T>): T? = userData.getUserData(key)
    override fun <T : Any?> putUserData(key: Key<T>, value: T?) = userData.putUserData(key, value)
}
