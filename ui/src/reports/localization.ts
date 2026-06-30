import {DatePreset, DurationPreset, GroupKey} from './types';

export const reportLabels = {
    title: 'Reports',
    search: 'Search',
    datePreset: 'Period',
    tags: 'Tags',
    user: 'User',
    project: 'Project',
    duration: 'Duration',
    groupBy: 'Group by',
    runningOnly: 'Only running',
    reset: 'Reset',
    csv: 'Export CSV',
    excel: 'Export Excel',
    print: 'Print / Save PDF',
    columns: 'Columns',
    pageSize: 'Rows per page',
    all: 'All',
    visibleEntries: 'Visible entries',
    currentFilter: 'Current filter',
};

export const datePresetLabels: Record<DatePreset, string> = {
    all: 'All time',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    thisYear: 'This year',
    custom: 'Custom',
};

export const durationPresetLabels: Record<DurationPreset, string> = {
    all: 'Any duration',
    '30m': '> 30 min',
    '1h': '> 1 h',
    '2h': '> 2 h',
    '4h': '> 4 h',
    custom: 'Custom',
};

export const groupLabels: Record<GroupKey, string> = {
    none: 'None',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    project: 'Project',
    user: 'User',
};
