export function safeFilename(name, fallback = 'export') {
  const cleaned = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function downloadTextFile({ filename, content }) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function workflowToYaml(workflow) {
  const lines = [];
  lines.push('version: "1.0.0"');
  lines.push(`id: ${workflow.id}`);
  lines.push(`name: ${workflow.name}`);
  lines.push(`kind: ${workflow.kind}`);
  lines.push(`description: ${workflow.description}`);
  lines.push('inputs:');
  (workflow.inputs || []).forEach((input) => {
    lines.push(`  - ${input}`);
  });
  lines.push('variables:');
  Object.entries(workflow.variables || {}).forEach(([key, value]) => {
    lines.push(`  ${key}: ${value === null ? 'null' : value}`);
  });
  lines.push('steps:');
  (workflow.steps || []).forEach((step) => {
    lines.push(`  - id: ${step.id}`);
    lines.push(`    actor: ${step.actor}`);
    lines.push(`    activity: ${step.activity}`);
    if (step.instruction) lines.push(`    instruction: ${step.instruction}`);
    if (step.validation) {
      lines.push('    validation:');
      lines.push(`      minCharacters: ${step.validation.minCharacters}`);
    }
    if (step.configuration && Object.keys(step.configuration).length > 0) {
      lines.push('    configuration:');
      Object.entries(step.configuration).forEach(([key, value]) => {
        lines.push(`      ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
      });
    }
    if (step.output) lines.push(`    output: ${step.output}`);
    if (step.skill) lines.push(`    skill: ${step.skill}`);
    if (step.inputs) {
      lines.push('    inputs:');
      Object.entries(step.inputs).forEach(([key, value]) => {
        lines.push(`      ${key}: ${value}`);
      });
    }
  });
  lines.push('outputs:');
  Object.entries(workflow.outputs || {}).forEach(([key, value]) => {
    lines.push(`  ${key}: ${value}`);
  });
  return lines.join('\n');
}
