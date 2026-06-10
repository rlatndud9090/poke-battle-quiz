# UI Verification Protocol

Use this when visual layout, interactions, or responsive behavior changes.

Minimum checks:

- Run component or integration tests for the changed UI.
- Start the app with `npm run dev -- --host 127.0.0.1` when browser behavior
  matters.
- Verify the main flow in a real browser or Playwright-compatible surface.
- Check that text does not overflow or overlap at mobile and desktop widths.
- Check that controls remain keyboard-accessible when applicable.

This is not the mail-editor CSS protocol. Do not import mail HTML compatibility,
inline-style roundtrip, or Storybook requirements unless this project later
adopts them through an ADR.
