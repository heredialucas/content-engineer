# Design system — Content Studio

This product follows the visual language defined in `../seguros-vyb/DESIGN.md`. Its design tokens below use that file as their source of truth; this document records how to apply them to the content studio rather than duplicating the unrelated Calendly page layouts.

## Tokens

| Role | Token | Value |
|---|---|---|
| Primary action / links | `--blue` | `#006bff` |
| Pressed action | `--blue-active` | `#004eba` |
| Headings | `--navy` | `#0b3558` |
| Deep contrast | `--navy-deep` | `#071a31` |
| Body text | `--body` | `#476788` |
| Canvas | `--canvas` | `#ffffff` |
| Soft surface | `--surface-soft` | `#f8f9fb` |
| Blue-tint surface | `--surface-tint` | `#f4f8ff` |
| Alternate surface | `--surface-alt` | `#f0f3f8` |
| Blue-soft surface | `--surface-blue-soft` | `#e7edf6` |
| Hairline | `--hairline` | `#a6bbd1` |
| Success | `--success` | `#0f7a4d` |
| Danger | `--danger` | `#b42318` |

Typography uses Montserrat when available, with system sans-serif fallbacks. Gilroy is commercial and must not be shipped without a license. Hierarchy comes from size and weight: large bold headings, medium-weight labels and readable regular body copy.

## Application rules

- Use the white canvas, deep-navy headings and blue-tinted neutral surfaces from the reference design.
- Reserve the saturated blue for the main action, selected controls, links and focus indicators. Pressed primary actions darken to `#004eba`.
- Use 8px button radii, 12px inner cards and up to 24px for large floating surfaces. Do not exceed 24px.
- Use low-contrast blue-gray shadows; avoid hard black shadows and decorative gradients that compete with the content.
- Keep spacing on a 4px base: 8, 12, 16, 24, 32, 40 and 48px are the preferred increments.
- The product UI is a working studio: prioritize project selection, creation format, prompt and preview over marketing-page decoration.
- On mobile, collapse navigation into the bottom bar, keep controls at least 44px high, stack cards and respect safe-area insets.
- Provide visible keyboard focus, clear validation feedback and pressed/disabled/loading states. These interactions supplement the reference file, which does not specify them.
- The studio UI uses the design-system blue. Generated creative assets continue to use each project's own brand profile.

## Source

The reference is the `DESIGN.md` at `~/Desktop/lucas/seguros-vyb/DESIGN.md`. Keep its token values authoritative and update this mapping only when that source changes.
