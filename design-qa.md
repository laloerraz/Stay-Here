# Minimal popup design QA

Source: C:/Users/laloe/.codex/generated_images/01a179ff-9138-7c81-acad-b31eecb8eee1/exec-5ae245e5-4acd-41f0-909e-c18f420fe30a.png

Initial comparison: docs/imagenes/minimal-comparison.png. Source 1136x1385 normalized to 370x451; implementation browser 1280x720 at 1x, cropped to popup width 370px. State: English, protected example.com, counts12/3, clicked links on, redirects off.

Earlier findings: P2 vertical rhythm was too tall (487px vs451px); P2 reload icon missing; P2 settings icon outline differed from the selected filled gear. Fixes: reduce section padding; use packaged upstream Bootstrap Icons for reload and filled settings; Arial matches the rounder reference typography more closely. Preserve original hand and official Ko-fi assets.

## Post-fix comparison
Evidence: docs/imagenes/minimal-comparison-final.png combines the normalized reference and actual browser capture in one input. Implementation: docs/imagenes/panel-minimal-preview.png (1280x720, 1x); content crop: docs/imagenes/panel-minimal.png (370x454). Popup frame is 370px wide; viewport1280x720. Reference1136x1385 normalized to370x451. Same English sample state. All content is readable in this combined view, so separate focused crops were unnecessary.

- Typography: Arial reproduces the reference neutral sans, regular domain heading, small muted helper text and medium brand. Remaining platform antialiasing/weight variation is P3.
- Spacing/layout: aligned19px side insets, matching section order, compact header, fine separators, ordinary switches and footer. Final454px vs reference451px is acceptable; no clipped controls.
- Colors: white base, dark text, muted grey labels, restrained blue switches/actions and green semantic status indicator. No hardware effects or ornamental cards.
- Assets: original hand and official Ko-fi PNGs retained. Upstream Bootstrap Icons packaged locally for gear and reload, license included. No remote runtime dependency.
- Copy: matches selected English labels and counts. Global vs site controls preserve their real existing semantics. Additional help and support disclosure remain available in Settings. Saved/error/paused/allowed states retain accurate messages.

## Functional evidence
Browser fixture exercised site allow/protect, global pause (site action disabled), both option switches, Settings open/close, and Ko-fi handler. Privacy resolves to the packaged English page. Browser console warnings/errors: none. Fixture uses simulated API state; it is not a real-extension installation test. Production background/guard code unchanged. Existing34 protection tests pass and scripts/validate.cjs passes. Updated existing integration-smoke expectations for the shortened Protected copy; full isolated-browser integration smoke not run in this task.

## Follow-up polish
P3: minor typography rasterization differences and a few pixels of vertical rhythm vs generated mock.

## Implementation checklist
- [x] Apply chosen minimalist design to existing popup.
- [x] Preserve IDs, event handlers, original brand assets and Ko-fi.
- [x] Compare reference and browser evidence after spacing/icon fixes.
- [x] Verify primary controls in browser fixture and run existing checks.

final result: passed
