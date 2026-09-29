/**
 * Mirrors backend src/utils/bdmRoles.js. Roles that behave exactly like a
 * solo BDM. Use instead of comparing user.role against 'BDM'.
 */
export const BDM_LIKE_ROLES = Object.freeze(['BDM', 'SAM']);

export const isBdmLikeRole = (role) => BDM_LIKE_ROLES.includes(role);
