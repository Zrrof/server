import * as React from 'react';
import {Button} from '@material-ui/core';
import {Alarm} from '@material-ui/icons';
import {Tracker} from './Tracker';
import {ActiveTrackers} from './ActiveTrackers';
import {DoneTrackers} from './DoneTrackers';
import {TagSelectorEntry} from '../tag/tagSelectorEntry';
import {RefreshTimeSpans} from './RefreshTimespans';
import {useSettings} from '../gql/settings';
import {SidyDialog} from '../sidy/SidyDialog';

export const DailyPage = () => {
    const [selectedEntries, setSelectedEntries] = React.useState<TagSelectorEntry[]>([]);
    const [sidyOpen, setSidyOpen] = React.useState(false);
    const {done, dateTimeInputStyle} = useSettings();
    const isSidy = done && dateTimeInputStyle === 'Sidy';

    return (
        <div>
            {isSidy ? (
                <div style={{display: 'flex', justifyContent: 'center', margin: '24px 0'}}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<Alarm />}
                        onClick={() => setSidyOpen(true)}
                    >
                        Zeit manuell eintragen
                    </Button>
                </div>
            ) : (
                <Tracker selectedEntries={selectedEntries} onSelectedEntriesChanged={setSelectedEntries} />
            )}
            <ActiveTrackers />
            <DoneTrackers
                addTagsToTracker={
                    selectedEntries.length === 0 ? (entries) => setSelectedEntries(selectedEntries.concat(entries)) : undefined
                }
            />
            <RefreshTimeSpans />
            <SidyDialog open={sidyOpen} onClose={() => setSidyOpen(false)} />
        </div>
    );
};
