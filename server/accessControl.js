function workflowIdFromExecution(execution) {
  const candidate = execution?.workflowId ?? execution?.workflow?.id ?? null;
  return candidate === null || candidate === undefined ? null : String(candidate);
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

