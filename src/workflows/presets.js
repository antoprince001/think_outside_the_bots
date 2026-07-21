import { parse } from 'yaml';
import presetsYaml from './presets.yaml?raw';

const parsed = parse(presetsYaml) ?? {};
const defaults = parsed.defaults ?? {};

export const presets = Array.isArray(parsed.presets)
  ? parsed.presets.map((preset) => ({
      ...preset,
      configuration: {
        reaskEnabled: defaults.reaskEnabled ?? true,
        reaskLimit: defaults.reaskLimit ?? 3,
        ...(preset.configuration ?? {}),
      },
    }))
  : [];
