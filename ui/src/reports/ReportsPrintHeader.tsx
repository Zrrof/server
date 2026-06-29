import * as React from 'react';
import moment from 'moment';
import {Typography} from '@material-ui/core';
import {ReportFilters} from './types';
import {activeFilterLabel} from './utils/reportUtils';

export const ReportsPrintHeader: React.FC<{filters: ReportFilters}> = ({filters}) => (
    <div className="reports-print-header">
        <Typography variant="h4" component="h1">Reports</Typography>
        <Typography variant="subtitle1">Printed at {moment().format('YYYY-MM-DD HH:mm')}</Typography>
        <Typography variant="subtitle2">{activeFilterLabel(filters)}</Typography>
    </div>
);
