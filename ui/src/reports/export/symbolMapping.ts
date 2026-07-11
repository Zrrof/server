import {SymbolMapping} from './excelSettings';

export const TAG_PRIORITY: string[] = [
    'Krank',
    'Urlaub',
    'Feiertag',
    'Zeitausgleich',
    'Dienstreise',
    'Homeoffice',
];

export const getSymbolForTags = (
    entryTags: Array<{key: string; value: string}> | null,
    mappings: SymbolMapping[],
): string => {
    if (!entryTags || entryTags.length === 0) {
        return '';
    }
    const tagKeys = entryTags.map((t) => t.key);
    for (const priorityTag of TAG_PRIORITY) {
        if (tagKeys.includes(priorityTag)) {
            const mapping = mappings.find((m) => m.tag === priorityTag);
            if (mapping) {
                return mapping.symbol;
            }
        }
    }
    for (const entryTag of entryTags) {
        const mapping = mappings.find((m) => m.tag === entryTag.key);
        if (mapping && !TAG_PRIORITY.includes(mapping.tag)) {
            return mapping.symbol;
        }
    }
    return '';
};
