# Graphify Analysis Report: api-server

## 1. Overview
- **Analyzed Path**: d:\project\egov-enterprise\api-server
- **Stats**: 602 Nodes, 1,463 Edges
- **Status**: Phase 1 (Core Module) Completed

## 2. God Nodes (Central Pillars)
The following nodes are highly connected and serve as the backbone of the api-server module:
- **api_security_config**: The security nexus. It bridges JWT filters, Role-Based Access Control (RBAC), and legacy session handling.
- **user_api_controller**: The primary interaction point for both user self-service and administrative tasks.
- **global_menu_advice**: A critical UI integration point for menu consistency.

## 3. Surprising Connections (AI Insights)
- **Legacy-Modern Bridge**: LegacyConfig manages ID generation strategies used by modern controllers.
- **Test Integrity**: ApiSpecificationComplianceTest provides a contract for all controllers.

## 4. Architectural Communities
- **Security & Auth**: Concentrated around ApiSecurityConfig and JWT classes.
- **System Management**: Clusters of Dept and User management APIs.
- **Legacy UI Support**: Includes legacy JS engines and assets.

## 5. Actionable Insights
- Refactor GlobalMenuAdvice to separate mapping logic.
- Add E2E verification for legacy JS files.
