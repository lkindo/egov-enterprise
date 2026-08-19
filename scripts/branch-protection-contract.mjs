export function validateClassicAdminEnforcement(classicProtection) {
  if (classicProtection?.enforce_admins?.enabled === true) return [];
  return ['classic branch protection does not enforce rules for administrators (enforce_admins.enabled=true required)'];
}
