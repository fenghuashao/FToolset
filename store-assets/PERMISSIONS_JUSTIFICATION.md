# Chrome Web Store 权限说明

按标题将对应英文正文粘贴到 Developer Dashboard 的 Privacy practices 字段。

## Single purpose

FToolset is an offline Chrome toolbar utility for preparing web links and text before copying or sharing. Users can generate or decode QR codes, strip common tracking parameters from links, and count or clean copied text entirely on their device.

## `activeTab`

FToolset uses the temporary access Chrome grants when the user invokes the extension to read the active tab's URL. The QR generator and Link cleaner prefill their URL field with that address and let the user restore it after editing. This avoids persistent access to websites and does not require reading browsing history.

## `storage`

FToolset stores the last selected tool and the optional quick-switcher bar display preference in local Chrome extension storage. Session storage temporarily passes text or a link chosen from a context menu along with the target tool ID to the popup, which consumes and removes it immediately. Neither storage area is synced to an account or sent to a server.

## `contextMenus`

FToolset adds Chrome context menu commands for links (generate QR code, clean tracking parameters) and selected text (generate QR code, clean and count text). When the user chooses a command, FToolset reads only the selected text or target link URL from the Chrome menu event and processes it locally on the device.

## Remote code

Select **No**. The extension packages all executable code and dependencies in the ZIP. QR encoding/decoding, link cleaning, and text processing run entirely offline in the browser without loading remotely hosted code.
