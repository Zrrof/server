import {getSymbolForTags, TAG_PRIORITY} from './symbolMapping';
import {SymbolMapping} from './excelSettings';

const defaultMappings: SymbolMapping[] = [
    {tag: 'Urlaub', symbol: 'U'},
    {tag: 'Krank', symbol: 'K'},
    {tag: 'Feiertag', symbol: 'F'},
    {tag: 'Homeoffice', symbol: 'HO'},
    {tag: 'Dienstreise', symbol: 'DR'},
    {tag: 'Zeitausgleich', symbol: 'ZA'},
    {tag: 'Berufsschule', symbol: 'BS'},
];

test('has correct priority order', () => {
    expect(TAG_PRIORITY).toEqual(['Krank', 'Urlaub', 'Feiertag', 'Zeitausgleich', 'Dienstreise', 'Homeoffice']);
});

test('returns symbol for matching tag', () => {
    const tags = [{key: 'Urlaub', value: 'true'}];
    expect(getSymbolForTags(tags, defaultMappings)).toBe('U');
});

test('returns empty for no tags', () => {
    expect(getSymbolForTags([], defaultMappings)).toBe('');
    expect(getSymbolForTags(null, defaultMappings)).toBe('');
});

test('respects priority: Krank before Urlaub', () => {
    const tags = [
        {key: 'Urlaub', value: 'true'},
        {key: 'Krank', value: 'true'},
    ];
    expect(getSymbolForTags(tags, defaultMappings)).toBe('K');
});

test('returns empty for unmapped tag', () => {
    const tags = [{key: 'Unbekannt', value: 'x'}];
    expect(getSymbolForTags(tags, defaultMappings)).toBe('');
});

test('returns custom tag symbol for non-priority tags', () => {
    const mappings: SymbolMapping[] = [
        ...defaultMappings,
        {tag: 'Projekt A', symbol: 'PA'},
    ];
    const tags = [{key: 'Projekt A', value: 'test'}];
    expect(getSymbolForTags(tags, mappings)).toBe('PA');
});
