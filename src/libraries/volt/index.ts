import { VOLT_CODEGEN } from './composer/codegen';
import { VOLT_FIGMA } from './composer/figmaMap';
import { composerConfig } from './composer/registry';
import { seedDoc } from './composer/seed';
import { ATOM_SECTIONS } from '../../playground/showcase/atoms';
import { MOLECULE_SECTIONS } from '../../playground/showcase/molecules';
import { ORGANISM_SECTIONS } from '../../playground/showcase/organisms';
import { DEFAULT_PRESET, PRESETS } from '../../theme/presets';
import { buildSemanticTokens } from '../../tokens/brand';
import { COMPONENT_TOKENS } from '../../tokens/component';
import { GLOBAL_TOKENS } from '../../tokens/global';
import type { UiLibrary } from '../types';
import { VOLT_STATUS_TOKENS } from './tokens/status';
import '../../components/atoms/atoms.css';
import '../../components/molecules/molecules.css';
import '../../components/organisms/organisms.css';

/**
 * The Volt pack: the EV charging design system, assembled from its existing
 * module locations (hybrid layout — volt content stays in place; only the
 * pack barrel lives here). CSS side-effect imports above ride this pack's
 * code-split chunk so Volt styles load exactly when the pack does.
 */
export const voltLibrary: UiLibrary = {
  id: 'volt',
  name: 'Volt',
  tagline: 'EV charging design system — global · brand · component',
  globalTokens: GLOBAL_TOKENS,
  componentTokens: COMPONENT_TOKENS,
  buildSemantic: (brand) => buildSemanticTokens(brand, VOLT_STATUS_TOKENS),
  presets: PRESETS,
  defaultPreset: DEFAULT_PRESET,
  levers: null,
  cssFiles: [
    'src/components/atoms/atoms.css',
    'src/components/molecules/molecules.css',
    'src/components/organisms/organisms.css',
  ],
  tiers: [
    {
      id: 'atoms',
      title: 'Atoms',
      blurb:
        'The primitives: buttons, badges, connector glyphs, power/price text.',
      sections: ATOM_SECTIONS,
    },
    {
      id: 'molecules',
      title: 'Molecules',
      blurb:
        'Domain compositions: chips, cards, pins, pricing, session stats.',
      sections: MOLECULE_SECTIONS,
    },
    {
      id: 'organisms',
      title: 'Organisms',
      blurb:
        'Full surfaces: station sheet, live charging session, start-charge flow.',
      sections: ORGANISM_SECTIONS,
    },
  ],
  composerConfig,
  codegen: VOLT_CODEGEN,
  figma: VOLT_FIGMA,
  seed: seedDoc,
  defaultViewport: 'phone',
};
