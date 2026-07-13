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
    const fullTag = `${key}:${value}`.toLowerCase();
    return mappings.find((m) => m.tag.toLowerCase() === fullTag)
        || mappings.find((m) => m.tag.toLowerCase() === key.toLowerCase());
};

const isPriorityTag = (tag: string): boolean =>
    TAG_PRIORITY.some((p) => p.toLowerCase() === tag.toLowerCase());

export const getSymbolForTags = (
    entryTags: Array<{key: string; value: string}> | null,
    mappings: SymbolMapping[],
): string => {
    if (!entryTags || entryTags.length === 0) {
        return '';
    }
    const tagKeysLower = entryTags.map((t) => t.key.toLowerCase());
    for (const priorityTag of TAG_PRIORITY) {
        const lowerPri = priorityTag.toLowerCase();
        if (tagKeysLower.includes(lowerPri)) {
            const entryTag = entryTags.find((t) => t.key.toLowerCase() === lowerPri);
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
        if (mapping && !isPriorityTag(mapping.tag)) {
            return mapping.symbol;
        }
    }
    return '';
};
