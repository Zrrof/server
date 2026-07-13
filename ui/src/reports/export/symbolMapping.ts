import {SymbolMapping} from './excelSettings';

export const TAG_PRIORITY: string[] = [
    'Krank',
    'Urlaub',
    'Feiertag',
    'Zeitausgleich',
    'Dienstreise',
    'Homeoffice',
];

const findMapping = (
    key: string,
    value: string,
    mappings: SymbolMapping[],
): SymbolMapping | undefined => {
    const fullTag = `${key}:${value}`;
    return mappings.find((m) => m.tag === fullTag) || mappings.find((m) => m.tag === key);
};

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
            const entryTag = entryTags.find((t) => t.key === priorityTag);
            if (entryTag) {
                const mapping = findMapping(entryTag.key, entryTag.value, mappings);
                if (mapping) {
                    return mapping.symbol;
                }
            }
        }
    }
    for (const entryTag of entryTags) {
        const mapping = findMapping(entryTag.key, entryTag.value, mappings);
        if (mapping && !TAG_PRIORITY.includes(mapping.tag)) {
            return mapping.symbol;
        }
    }
    return '';
};
