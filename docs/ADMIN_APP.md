# Admin App Design Specifications

This file serves as a safe place to store the UI and UX requirements for the future Laundristic Admin App. We will start working on this once the main customer application is finished.

## Visual Design & Theme

- **Aesthetic**: "Calm, peace, zen-like, premium spa"
- **Selected Theme**: **Dusty Blue & Sand** (Based on the second mockup from our design exploration).
- **Primary Colors**: Soft dusty blues and muted slate blues.
- **Backgrounds**: Warm off-white/sand tones to create a breathable, premium feel.

### Key Components to Port
When scaffolding the admin app, ensure the following patterns from the main app are retained but adapted to the Dusty Blue color scheme:
- `font-family`: Fraunces (display) and Hanken Grotesk (body)
- Soft, diffused drop-shadows on cards and sheets.
- Pill-shaped status indicators.
- 24px border radii for main cards.
- 16px minimum font size for inputs to prevent iOS Safari zoom.

## Note for Claude Code
Please refer to these specifications when setting up the initial `tokens.css` or `admin-tokens.css` for the Admin application. Ensure the primary accents (`--color-green`, etc.) are replaced with the Dusty Blue equivalents, while maintaining the same structural spacing and premium feel as the main app.
