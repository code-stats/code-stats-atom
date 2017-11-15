## 2.0.4 - Update issues path

## 2.0.3 (unreleased) - Update publish instructions

## 2.0.2 (unreleased) - Repo and UA changes

* Changed repository URLs to point to GitLab where new repository is.
* Added reporting of plugin version as user-agent in HTTP requests.

## 2.0.1 - Local time offset

Small change to send the local time offset along with the coding timestamp. This will be
user in the future for different graphs on the website.

## 2.0.0 - Change detection rewrite

The old way of detecting changes in the editor and trying to parse some amount of changed characters from them didn't really work. Sometimes Atom called the change event tens of times repeadetly - which I couldn't reproduce - and that gave users tons of unearned XP. As this happened even after many fixes, I decided to rewrite the plugin. The new version of the plugin listens to keystroke events and thus accurately calculates the amount of XP to give.

Caveats:

* Sometimes keystrokes that don't add characters are counted as XP. For example, if you type ctrl+s, release ctrl and then release s, the s will be counted even though it was not added into the text. I think XP granted by such events will be minimal compared to the amount of code written, so it is not an issue.
* Copypaste operations are not counted unless you use the trick described above. 😛

Other notes:

* Fixed an issue where the plugin would still send XP even though it was disabled.

## 1.3.2 - Fixes

* Fixed sending pulse even if API key was not set
* Fixed crash when doing "Replace all" (editor was not available)
* `apm` wanted to bump the version to 1.3.x for some reason

## 1.2.3 - Protip

* Don't code while tired and watching TV. Fix for a fix.

## 1.2.2 - Another XP fix

* Copypasting and find-replace operations also resulted in huge amounts of XP in some situations. XP was now limited to a max of 200 per operation.

## 1.2.1 - Fix for too much XP

* Fixed an issue where operating on a big file gave ridiculous amounts of XP.

## 1.2.0 - Published in Atom repos

## 1.0.0 - First public release
* Added correct licence
* Some doc fixes

## 0.1.4 - Less load
* Set upload timer to 10 seconds and ensured it won't upload while typing. This saves the server.

## 0.1.3 - Nearing public release
* Added API URL as setting
* Added observing for settings, so that settings are updated automatically
* Added correct default address

## 0.1.0 - Initial alpha release
* Works quite fine
