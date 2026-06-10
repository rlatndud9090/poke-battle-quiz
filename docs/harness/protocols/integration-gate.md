# Integration Gate Protocol

The integrator owns this sequence.

```sh
npm run harness:check
npm run lint
npm run build
npm run test:run
```

Or run:

```sh
npm run harness:gate
```

Rules:

- Run the steps in order.
- If any step fails, fix the cause and restart from `harness:check`.
- Do not claim completion without fresh output from the gate.
- For UI work, include the UI verification protocol when layout or interaction
  behavior changed.
