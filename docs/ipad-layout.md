# iPad Layout

The tablet layout is isolated in public/game/tablet.css. iPads using the desktop Safari identity (MacIntel with multiple touch points) keep tablet controls even when a trackpad supplies fine-pointer input. Phones and non-touch desktops retain their existing layouts. iPad portrait is supported without the rotate-device input blocker.

The visual viewport supplies the usable height as Safari browser chrome changes. Touch targets are at least 44 CSS pixels for principal controls. Movement controls use 48-pixel targets. Combat uses the same native two-tap select/execute flow and existing keyboard controls. Hover tooltips ignore touch pointer events; tapping a unit's statuses still opens its status dialog.

Validation: tools/test_ipad_detection.cjs covers device classification, trackpads, desktops and Split View classification. Browser checks at 1194x834, 1366x1024, 834x1194 and 1024x1366 exercise touch title targets, movement, menu navigation, gear scrolling, combat categories, actual attack execution and keyboard cancellation. These are Chromium-based touch simulations, not physical M1 iPad or native Safari certification.

Save keys, save contents, combat rules and artwork are unchanged. Browser-local saves do not automatically transfer from a computer to an iPad; use Export Save and Restore Save Files for transfer.
