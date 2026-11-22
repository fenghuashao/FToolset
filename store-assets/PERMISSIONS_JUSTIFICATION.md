# Chrome Web Store 权限说明

按标题将对应英文正文粘贴到 Developer Dashboard 的 Privacy practices 字段。

## Single purpose

FToolset creates customizable QR codes from links and text directly in the Chrome toolbar. Users can generate a code from the current tab URL, a selected link or text, or manual input, then preview, copy, or download it on their device.

## `activeTab`

FToolset uses the temporary access Chrome grants when the user invokes the extension to read the active tab's URL. The QR generator fills its content field with that URL and lets the user restore it after editing. This avoids persistent access to websites and does not require reading the user's browsing history.

## `storage`

FToolset stores the last selected tool in local Chrome extension storage. Session storage passes text or a link that the user selected from a context menu to the popup. The popup consumes and removes the pending value. Neither storage area is synced to an account or sent to a server.

## `contextMenus`

FToolset adds Chrome context menu commands for links and selected text. When the user chooses one of these commands, FToolset reads the selected text or target URL from the Chrome menu event to fill the QR generator. FToolset processes the value on the device.

## Remote code

Select **No**. The extension packages its executable code and dependencies in the ZIP. QR and logo processing run in the browser without loading remotely hosted code.
