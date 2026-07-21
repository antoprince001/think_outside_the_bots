import { parse } from 'yaml';
import presetMeta from './presets.yaml?raw';
import { DEFAULT_REASK_LIMIT } from '../constants';
import feynmanYaml from './presets/feynman.yaml?raw';
import socraticYaml from './presets/socratic.yaml?raw';
import freezeYaml from './presets/freeze.yaml?raw';
import longDraftYaml from './presets/long-draft.yaml?raw';
import spacedRepetitionYaml from './presets/spaced-repetition.yaml?raw';

const presetMetaData = parse(presetMeta) ?? {};
const defaults = presetMetaData.defaults ?? {};

const presetSources = [feynmanYaml, socraticYaml, freezeYaml, longDraftYaml, spacedRepetitionYaml];

export const presets = presetSources.map((source) => {
  const preset = parse(source) ?? {};
  return {
    ...preset,
    configuration: {
      reaskEnabled: defaults.reaskEnabled ?? true,
      reaskLimit: defaults.reaskLimit ?? DEFAULT_REASK_LIMIT,
      ...(preset.configuration ?? {}),
    },
  };
});
