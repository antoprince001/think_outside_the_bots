import { parse } from 'yaml';
import { uid } from './uid';

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
  if (workflow.configuration && Object.keys(workflow.configuration).length > 0) {
    lines.push('configuration:');
    Object.entries(workflow.configuration).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        lines.push(`  ${key}:`);
        value.forEach((item) => {
          lines.push(`    - ${item}`);
        });
      } else if (typeof value === 'string') {
        lines.push(`  ${key}: ${value}`);
      } else if (typeof value === 'boolean') {
        lines.push(`  ${key}: ${value}`);
      } else if (value === null) {
        lines.push(`  ${key}: null`);
      } else {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    });
  }
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

export function workflowToMarkdown(workflow) {
  return ['# Workflow export', '', '```yaml', workflowToYaml(workflow), '```'].join('\n');
}

function extractYamlPayload(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const fencedBlock = trimmed.match(/```(?:yaml|yml|text)?\s*([\s\S]*?)\s*```/i);
  if (fencedBlock?.[1]) {
    return fencedBlock[1].trim();
  }

  return trimmed.replace(/^#.*$/gm, '').trim();
}

export function parseWorkflowText(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('The selected file is empty.');
  }

  const yamlPayload = extractYamlPayload(trimmed);
  if (!yamlPayload) {
    throw new Error('The selected file is empty.');
  }

  const parsed = parse(yamlPayload);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The selected file is not a valid workflow export.');
  }

  return {
    id: parsed.id || uid(),
    name: parsed.name || 'Imported workflow',
    kind: parsed.kind || 'custom',
    description: parsed.description || 'Imported workflow.',
    inputs: Array.isArray(parsed.inputs) ? parsed.inputs : ['problem'],
    variables: parsed.variables && typeof parsed.variables === 'object' && !Array.isArray(parsed.variables) ? parsed.variables : {},
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    outputs: parsed.outputs && typeof parsed.outputs === 'object' && !Array.isArray(parsed.outputs) ? parsed.outputs : {},
    configuration: parsed.configuration && typeof parsed.configuration === 'object' && !Array.isArray(parsed.configuration) ? parsed.configuration : {},
  };
}
