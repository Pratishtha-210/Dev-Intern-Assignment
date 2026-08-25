import { describe, expect, it } from 'vitest';
import { VOLT_CODEGEN } from '../libraries/volt/composer/codegen';
import { pascalCase, puckDataToJsx } from './codegen';
import type { Data } from '@puckeditor/core';

const puckDataToJsxVolt = (data: Data, name: string) =>
  puckDataToJsx(data, name, VOLT_CODEGEN);

describe('pascalCase', () => {
  it('normalizes screen names', () => {
    expect(pascalCase('Active session')).toBe('ActiveSession');
    expect(pascalCase('station-detail v2')).toBe('StationDetailV2');
  });
});

describe('puckDataToJsx', () => {
  it('generates a simple screen with grouped imports and label-as-children', () => {
    const data: Data = {
      content: [
        {
          type: 'Button',
          props: { id: 'b1', label: 'Charge now', variant: 'solid', size: 'lg', loading: false, disabled: false },
        },
      ],
      root: { props: {} },
    };
    expect(puckDataToJsxVolt(data, 'Quick actions')).toBe(
      `import { Button } from '../components/atoms';

export function QuickActionsScreen() {
  return (
    <Button variant="solid" size="lg">
      Charge now
    </Button>
  );
}
`,
    );
  });

  it('recurses slots, omits zero/false optionals, and imports fixtures', () => {
    const data: Data = {
      content: [
        {
          type: 'ScreenHeader',
          props: { id: 'h', title: 'Nearby', subtitle: '', back: true },
        },
        {
          type: 'Stack',
          props: {
            id: 's',
            gap: 12,
            padding: 16,
            items: [
              { type: 'StationListCard', props: { id: 'c', station: 1, variant: 'selected' } },
              { type: 'MapPin', props: { id: 'm', status: 'faulted', count: 0, selected: false, cluster: 0 } },
              { type: 'PowerText', props: { id: 'p', kw: 350, tier: 3, emphasis: true } },
            ],
          },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'Discovery');
    expect(jsx).toContain(
      "import { PowerText } from '../components/atoms';",
    );
    expect(jsx).toContain(
      "import { MapPin, StationListCard } from '../components/molecules';",
    );
    expect(jsx).toContain(
      "import { ScreenHeader, Stack } from './primitives';",
    );
    expect(jsx).toContain(
      "import { SAMPLE_STATIONS } from '../components/data';",
    );
    expect(jsx).toContain('<ScreenHeader title="Nearby" back />');
    expect(jsx).toContain('<Stack gap={12} padding={16}>');
    expect(jsx).toContain('<StationListCard station={SAMPLE_STATIONS[1]} variant="selected" />');
    expect(jsx).toContain('<MapPin status="faulted" />'); // count/cluster omitted at 0
    expect(jsx).toContain('<PowerText kw={350} tier={3} emphasis />');
  });

  it('mirrors registry semantics for count badges and sessions', () => {
    const data: Data = {
      content: [
        { type: 'StatusBadge', props: { id: 'sb', status: 'available', form: 'count', free: 4, total: 6 } },
        {
          type: 'ActiveChargingSession',
          props: { id: 'a', archetype: 'ring', state: 'charging', telemetry: true, soc: 64, kw: 187 },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'Session');
    expect(jsx).toContain('count={{ free: 4, total: 6 }}');
    expect(jsx).toContain('session={{ ...SAMPLE_SESSION, soc: 64, kw: 187 }}');
    expect(jsx).toContain("import { SAMPLE_SESSION } from '../components/data';");
  });

  it('throws on unknown component types', () => {
    const data: Data = {
      content: [{ type: 'Mystery', props: { id: 'x' } }],
      root: { props: {} },
    };
    expect(() => puckDataToJsxVolt(data, 'X')).toThrow(/No JSX emitter/);
  });

  it('emits Group with token-index gaps, omitting defaults', () => {
    const data: Data = {
      content: [
        {
          type: 'Group',
          props: {
            id: 'g',
            direction: 'horizontal',
            wrap: true,
            gapV: 0,
            gapH: 2,
            padding: 4,
            align: 'center',
            justify: 'start',
            items: [
              { type: 'Spacer', props: { id: 'sp', height: 24 } },
            ],
          },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'Grouped');
    expect(jsx).toContain('<Group direction="horizontal" wrap gapH={2} padding={4} align="center">');
    expect(jsx).toContain('<Spacer height={24} />');
    expect(jsx).toContain("import { Group, Spacer } from './primitives';");
  });

  it('wraps non-default box props in LayoutBox with import', () => {
    const data: Data = {
      content: [
        {
          type: 'Button',
          props: {
            id: 'b1',
            label: 'Go',
            variant: 'solid',
            size: 'lg',
            loading: false,
            disabled: false,
            box: { align: 'center', sticky: 'bottom', bleed: true },
          },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'Boxed');
    expect(jsx).toContain('<LayoutBox align="center" sticky="bottom" bleed>');
    expect(jsx).toContain("import { LayoutBox } from './primitives';");
  });

  it('default box emits no wrapper', () => {
    const data: Data = {
      content: [
        {
          type: 'Button',
          props: {
            id: 'b1',
            label: 'Go',
            variant: 'solid',
            size: 'lg',
            loading: false,
            disabled: false,
            box: { align: 'stretch', sticky: 'none', bleed: false },
          },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'Plain');
    expect(jsx).not.toContain('LayoutBox');
  });

  it('wraps the screen in Page when root layout props are set', () => {
    const data: Data = {
      content: [
        {
          type: 'Button',
          props: { id: 'b1', label: 'Go', variant: 'solid', size: 'lg', loading: false, disabled: false },
        },
      ],
      root: { props: { sidePadding: 4, blockGap: 3 } } as Data['root'],
    };
    const jsx = puckDataToJsxVolt(data, 'Padded');
    expect(jsx).toContain('<Page sidePadding={4} blockGap={3}>');
    expect(jsx).toContain("import { Page } from './primitives';");
  });

  it('emits no Page wrapper for empty root props', () => {
    const data: Data = {
      content: [
        {
          type: 'Button',
          props: { id: 'b1', label: 'Go', variant: 'solid', size: 'lg', loading: false, disabled: false },
        },
      ],
      root: { props: {} },
    };
    expect(puckDataToJsxVolt(data, 'Bare')).not.toContain('Page');
  });

  it('correctly separates imports for fixtures from different module sources', () => {
    const data: Data = {
      content: [
        {
          type: 'PricingTable',
          props: { id: 'pt', showMember: true, idleFeePerMin: 0.4, notes: true },
        },
      ],
      root: { props: {} },
    };
    const jsx = puckDataToJsxVolt(data, 'StationDetail');
    expect(jsx).toContain("import { SAMPLE_PRICE_BANDS } from '../components/data';");
    expect(jsx).toContain("import { SAMPLE_TARIFF_NOTES } from '../components/tariffs';");
  });
});
