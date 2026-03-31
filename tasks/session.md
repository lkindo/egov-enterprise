# Session: 2026-04-01

## Status: ACTIVE
- [X] Fix compile error in `NotificationServicePaginationTest` (isRead builder)
- [ ] Fix Hibernate deprecation in `HibernatePerformanceConfig` (getStartTime) - Reverting `getStartTimestamp()` and adding `@SuppressWarnings("deprecation")` if needed.
- [X] Fix unnecessary `@SuppressWarnings` in `UserLogRepositoryImpl`
- [X] Fix resource leaks and unused imports in `PostgresContainerTest`
- [X] Fix resource leak in `TestcontainersConfig`
- [X] Clean up unused imports and variables in `MenuServiceIntegrationTest`

## Current Activity
Final verification of fixes.
Addressing Hibernate deprecation persistence.
Dealing with persistent resource leak in PostgresContainerTest.
