function workflowIdFromExecution(execution) {
  const candidate = execution?.workflowId ?? execution?.workflow?.id ?? null;
  return candidate === null || candidate === undefined ? null : String(candidate);
}

const APPROVAL_STATUSES = new Set(['pending', 'approved', 'rejected']);

export function normalizeApprovalStatus(status, fallback = 'approved') {
  const normalized = String(status || '').trim().toLowerCase();
  if (APPROVAL_STATUSES.has(normalized)) return normalized;
  return APPROVAL_STATUSES.has(fallback) ? fallback : 'approved';
}

export function isUserApproved(user) {
  if (!user) return false;
  if (String(user.role || '') === 'admin') return true;
  return normalizeApprovalStatus(user.approvalStatus, 'approved') === 'approved';
}

function normalizeWorkflowIdsInput(input) {
  if (Array.isArray(input)) {
    return input
      .flatMap((part) => String(part || '').split(','))
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return String(input || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function findUserByEmail(config, email) {
  const target = String(email || '').trim().toLowerCase();
  return (config?.users || []).find((user) => String(user.email || '').toLowerCase() === target) || null;
}

export function findUserById(config, userId) {
  const target = String(userId || '').trim();
  return (config?.users || []).find((user) => String(user.id) === target) || null;
}

export function authenticateUser(config, email, password) {
  const user = findUserByEmail(config, email);
  if (!user) return null;
  if (String(user.password || '') !== String(password || '')) return null;
  return user;
}

export function getAllowedWorkflowIds(config, user) {
  if (!user) return new Set();
  if (user.role === 'admin') return null;

  const clientId = String(user.clientId || '');
  const client = (config?.clients || []).find((entry) => String(entry.id) === clientId);
  const ids = (client?.workflowIds || []).map((id) => String(id));
  return new Set(ids);
}

export function applyWorkflowSelection(allowedWorkflowIds, selectedWorkflowIdsInput) {
  const selectedIds = normalizeWorkflowIdsInput(selectedWorkflowIdsInput);
  if (selectedIds.length === 0) return allowedWorkflowIds;

  const selectedSet = new Set(selectedIds);
  if (allowedWorkflowIds === null) {
    return selectedSet;
  }

  const out = new Set();
  for (const workflowId of allowedWorkflowIds || []) {
    const normalized = String(workflowId);
    if (selectedSet.has(normalized)) out.add(normalized);
  }
  return out;
}

export function canAccessWorkflow(allowedWorkflowIds, workflowId) {
  if (allowedWorkflowIds === null) return true;
  const value = workflowId === null || workflowId === undefined ? '' : String(workflowId);
  return allowedWorkflowIds.has(value);
}

export function filterWorkflows(workflows, allowedWorkflowIds) {
  if (allowedWorkflowIds === null) return workflows;
  return (workflows || []).filter((workflow) => canAccessWorkflow(allowedWorkflowIds, workflow?.id));
}

export function filterExecutions(executions, allowedWorkflowIds) {
  if (allowedWorkflowIds === null) return executions;
  return (executions || []).filter((execution) => canAccessWorkflow(allowedWorkflowIds, workflowIdFromExecution(execution)));
}
