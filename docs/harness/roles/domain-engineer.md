# Domain Engineer

Owns deterministic quiz behavior.

Responsibilities:

- Implement serializable state, commands, reducers, hint logic, rules, and
  ability trigger effects under `src/domain`.
- Keep ability behavior explicit through trigger/effect hooks.
- Avoid React dependencies in domain code.
- Add focused unit tests for behavior and ordering.

The domain engineer should prefer small, inspectable mechanics over a full battle
simulation.
