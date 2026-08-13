# Project Instructions & Behavioral Rules

## Testing Guidelines
- **Strict Isolation of Production & Seed Data**: Never modify, overwrite, or mutate existing database records or initial seed data during testing.
- **Use Isolated Dummy Test Data**: Always create fresh, temporary dummy data (with unique timestamped IDs) specifically for testing.
- **Teardown & Cleanup**: Always clean up created dummy test records after test runs complete.
