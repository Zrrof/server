export interface SymbolMapping {
    tag: string;
    symbol: string;
}

export interface ExportSettings {
    name: string;
    department: string;
    monthlyHours: number;
    workDaysPerWeek: number;
    saveSettings: boolean;
    symbolMappings: SymbolMapping[];
}

const STORAGE_KEY = 'trackit.export.settings';

const DEFAULT_SYMBOLS: SymbolMapping[] = [
    {tag: 'Urlaub', symbol: 'U'},
    {tag: 'Krank', symbol: 'K'},
    {tag: 'Feiertag', symbol: 'F'},
    {tag: 'Homeoffice', symbol: 'HO'},
    {tag: 'Dienstreise', symbol: 'DR'},
    {tag: 'Zeitausgleich', symbol: 'ZA'},
    {tag: 'Berufsschule', symbol: 'BS'},
];

export const DEFAULT_SETTINGS: ExportSettings = {
    name: '',
    department: '',
    monthlyHours: 17,
    workDaysPerWeek: 5,
    saveSettings: true,
    symbolMappings: DEFAULT_SYMBOLS,
};

export const loadSettings = (): ExportSettings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {...DEFAULT_SETTINGS};
        }
        const parsed = JSON.parse(raw) as Partial<ExportSettings>;
        return {
            name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_SETTINGS.name,
            department: typeof parsed.department === 'string' ? parsed.department : DEFAULT_SETTINGS.department,
            monthlyHours: typeof parsed.monthlyHours === 'number' ? parsed.monthlyHours : DEFAULT_SETTINGS.monthlyHours,
            workDaysPerWeek:
                typeof parsed.workDaysPerWeek === 'number' ? parsed.workDaysPerWeek : DEFAULT_SETTINGS.workDaysPerWeek,
            saveSettings: parsed.saveSettings !== false,
            symbolMappings: Array.isArray(parsed.symbolMappings)
                ? parsed.symbolMappings
                : DEFAULT_SETTINGS.symbolMappings,
        };
    } catch (_e) {
        return {...DEFAULT_SETTINGS};
    }
};

export const saveSettings = (settings: ExportSettings): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
