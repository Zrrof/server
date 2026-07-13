export interface ReportTag {
    key: string;
    value: string;
}

export interface ReportTimeSpan {
    id: number;
    start: string;
    end: string | null;
    oldStart?: string | null;
    tags: ReportTag[] | null;
    note: string;
}

export type SortDirection = 'asc' | 'desc';
export type SortKey = 'date' | 'start' | 'end' | 'duration' | 'description' | 'tags';

export interface ReportSort {
    key: SortKey;
    direction: SortDirection;
}

export type DatePreset =
    | 'all'
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisYear'
    | 'custom';

export type DurationPreset = 'all' | '30m' | '1h' | '2h' | '4h' | 'custom';
export type GroupKey = 'none' | 'day' | 'week' | 'month' | 'year';
export type ChartKey = 'none' | 'day' | 'week' | 'month' | 'tag';

export interface ReportFilters {
    search: string;
    datePreset: DatePreset;
    customStart: string;
    customEnd: string;
    tags: string[];
    durationPreset: DurationPreset;
    customDurationMinutes: number;
    groupBy: GroupKey;
    monthOffset: number;
}

export interface ReportColumn {
    id: string;
    label: string;
    visible: boolean;
}

export interface ReportSettings {
    sort: ReportSort | null;
    columns: ReportColumn[];
    pageSize: number | 'all';
    filters: ReportFilters;
    chart: ChartKey;
    collapsedGroups: string[];
}

export interface ReportGroup {
    key: string;
    label: string;
    entries: ReportTimeSpan[];
    totalMs: number;
}
