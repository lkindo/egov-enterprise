import * as contracts from '../../scripts/export-deliverables-workspace.mjs';
import { PRIVATE_ANALYSIS_VALIDATION } from './privacy-warnings.mjs';

// Explicit adapter for the local, authenticated workspace. Do not use for
// repository/public exports: their default sensitivity errors remain intact.
export const validatePrivateBacklog = (pack, context = null) => contracts.validateBacklogPack(pack, context, PRIVATE_ANALYSIS_VALIDATION);
export const validatePrivateReadiness = (pack, context = null) => contracts.validateDevelopmentReadiness(pack, context, PRIVATE_ANALYSIS_VALIDATION);
export const privateWorkspaceContracts = {
  ...contracts,
  exportReviewSheets: (root, directory, options = {}) => contracts.exportReviewSheets(root, directory, { ...options, ...PRIVATE_ANALYSIS_VALIDATION }),
  importReviewSheets: (root, directory, options = {}) => contracts.importReviewSheets(root, directory, { ...options, ...PRIVATE_ANALYSIS_VALIDATION }),
  exportUatChecklist: (root, directory, options = {}) => contracts.exportUatChecklist(root, directory, { ...options, ...PRIVATE_ANALYSIS_VALIDATION }),
  importUatChecklist: (root, directory, options = {}) => contracts.importUatChecklist(root, directory, { ...options, ...PRIVATE_ANALYSIS_VALIDATION }),

  validateBacklogPack: validatePrivateBacklog,
  validateDevelopmentReadiness: validatePrivateReadiness,
  generateWorkPackagePlan: (pack, context, options = {}) => contracts.generateWorkPackagePlan(pack, context, { ...options, ...PRIVATE_ANALYSIS_VALIDATION }),
};
