; Adds a custom installer page — shown right after the "choose install
; directory" page, before files are copied — that asks where SSAIT Athlete360
; should store its data and where it should keep rolling backups. The
; app itself (electron/main.cjs, electron/location-config.ts) reads the
; same file this writes ($APPDATA\SSAIT Athlete360\location.json) on first
; launch and, finding it already configured, skips straight past its own
; in-app "choose a folder" screen into account setup.
;
; Skipped entirely on an update/reinstall: if location.json already
; exists, the page never shows and the file is never touched, so an
; existing install's chosen folders (and its data) are never disturbed.
;
; The "$APPDATA\SSAIT Athlete360" path below must stay byte-identical to
; Electron's app.getPath("userData"), which resolves to %APPDATA%\<app name>
; — and the app name comes from "productName" in package.json (it falls back
; to "name", which is the lowercase slug, if productName is ever removed).
; If the two drift apart the page still renders and still writes a file, but
; the app reads a different path, never sees it, and silently falls back to
; asking again on first launch.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WordFunc.nsh"

Var AthLocationConfigured
Var AthStorageField
Var AthBackupField
Var AthChosenStorage
Var AthChosenBackup

!macro customInit
  StrCpy $AthLocationConfigured "0"
  ${If} ${FileExists} "$APPDATA\SSAIT Athlete360\location.json"
    StrCpy $AthLocationConfigured "1"
  ${EndIf}

  ; The bundled NSIS compiler's dead-code elimination doesn't always see a
  ; `Page custom` callback as "used" when it's defined outside the macro
  ; that emits the Page instruction (ours is emitted from
  ; customPageAfterChangeDir, in electron-builder's own template) — it
  ; strips the function and the page silently breaks. GetFunctionAddress
  ; is the documented way to mark a function referenced without altering
  ; control flow.
  GetFunctionAddress $0 AthLocationPageCreate
  GetFunctionAddress $0 AthLocationPageLeave
!macroend

!macro customPageAfterChangeDir
  Page custom AthLocationPageCreate AthLocationPageLeave
!macroend

Function AthLocationBrowseStorage
  nsDialogs::SelectFolderDialog "Choose a data folder" "$AthChosenStorage"
  Pop $0
  ${If} $0 != "error"
    StrCpy $AthChosenStorage "$0"
    ${NSD_SetText} $AthStorageField "$AthChosenStorage"
  ${EndIf}
FunctionEnd

Function AthLocationBrowseBackup
  nsDialogs::SelectFolderDialog "Choose a backup folder" "$AthChosenBackup"
  Pop $0
  ${If} $0 != "error"
    StrCpy $AthChosenBackup "$0"
    ${NSD_SetText} $AthBackupField "$AthChosenBackup"
  ${EndIf}
FunctionEnd

Function AthLocationPageCreate
  ; Already set up once before (update/reinstall) — never ask again.
  ${If} $AthLocationConfigured == "1"
    Abort
  ${EndIf}

  ${If} $AthChosenStorage == ""
    StrCpy $AthChosenStorage "$APPDATA\SSAIT Athlete360"
  ${EndIf}
  ${If} $AthChosenBackup == ""
    StrCpy $AthChosenBackup "$APPDATA\SSAIT Athlete360\backups"
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0u 100% 24u "Choose where SSAIT Athlete360 keeps your data and rolling backups. You can change these later from within the app."
  Pop $0

  ${NSD_CreateLabel} 0 32u 100% 10u "Data folder"
  Pop $0
  ${NSD_CreateText} 0 44u 74% 12u "$AthChosenStorage"
  Pop $AthStorageField
  ${NSD_CreateButton} 76% 43u 24% 14u "Browse..."
  Pop $0
  ${NSD_OnClick} $0 AthLocationBrowseStorage

  ${NSD_CreateLabel} 0 66u 100% 10u "Backup folder"
  Pop $0
  ${NSD_CreateText} 0 78u 74% 12u "$AthChosenBackup"
  Pop $AthBackupField
  ${NSD_CreateButton} 76% 77u 24% 14u "Browse..."
  Pop $0
  ${NSD_OnClick} $0 AthLocationBrowseBackup

  nsDialogs::Show
FunctionEnd

Function AthLocationPageLeave
  ${NSD_GetText} $AthStorageField $AthChosenStorage
  ${NSD_GetText} $AthBackupField $AthChosenBackup

  ${If} $AthChosenStorage == ""
    StrCpy $AthChosenStorage "$APPDATA\SSAIT Athlete360"
  ${EndIf}
  ${If} $AthChosenBackup == ""
    StrCpy $AthChosenBackup "$APPDATA\SSAIT Athlete360\backups"
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $AthLocationConfigured == "0"
    CreateDirectory "$APPDATA\SSAIT Athlete360"
    CreateDirectory "$AthChosenStorage"
    CreateDirectory "$AthChosenBackup"

    ; JSON needs backslashes escaped; Node accepts forward slashes in
    ; Windows paths just as well, so normalizing to "/" sidesteps needing
    ; a real JSON string-escape routine here.
    ${WordReplace} "$AthChosenStorage" "\" "/" "+" $1
    ${WordReplace} "$AthChosenBackup" "\" "/" "+" $2

    FileOpen $0 "$APPDATA\SSAIT Athlete360\location.json" w
    FileWrite $0 '{"storagePath":"$1","backupPath":"$2"}'
    FileClose $0
  ${EndIf}
!macroend
