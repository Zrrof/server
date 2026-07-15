import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
    Paper,
    CircularProgress,
    TextField,
} from '@material-ui/core';
import {KeyboardDatePicker, KeyboardTimePicker} from '@material-ui/pickers';
import moment from 'moment';
import {TagSelectorEntry} from '../tag/tagSelectorEntry';
import {TagSelector} from '../tag/TagSelector';
import {useMutation} from '@apollo/react-hooks';
import * as gqlTimeSpan from '../gql/timeSpan';
import {AddTimeSpan, AddTimeSpanVariables} from '../gql/__generated__/AddTimeSpan';
import {InputTimeSpanTag} from '../gql/__generated__/globalTypes';
import {useSnackbar} from 'notistack';
import {addTimeSpanToCache} from '../gql/utils';
import {inUserTz} from '../timespan/timeutils';
import {SidyStepIndicator} from './SidyStepIndicator';

type Step = 1 | 2 | 3 | 'result';

interface Props {
    open: boolean;
    onClose: () => void;
}

const dateTimeStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    padding: 24,
};

const pickerStyle: React.CSSProperties = {
    width: 280,
};

const pickerInputProps = {style: {fontSize: 28, textAlign: 'center' as const, padding: '12px 0'}};

export const SidyDialog: React.FC<Props> = ({open, onClose}) => {
    const [step, setStep] = React.useState<Step>(1);
    const [tags, setTags] = React.useState<TagSelectorEntry[]>([]);
    const [start, setStart] = React.useState<moment.Moment>(moment().subtract(1, 'hour'));
    const [end, setEnd] = React.useState<moment.Moment>(moment());
    const [note, setNote] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const [addTimeSpan] = useMutation<AddTimeSpan, AddTimeSpanVariables>(gqlTimeSpan.AddTimeSpan, {
        update: (cache, {data}) => {
            if (!data || !data.createTimeSpan) {
                return;
            }
            addTimeSpanToCache(cache, data.createTimeSpan);
        },
    });
    const {enqueueSnackbar} = useSnackbar();

    React.useEffect(() => {
        if (open) {
            setStep(1);
            setTags([]);
            setStart(moment().subtract(1, 'hour'));
            setEnd(moment());
            setNote('');
            setError(null);
            setLoading(false);
        }
    }, [open]);

    const handleStartChange = (d: moment.Moment | null) => {
        if (d && d.isValid()) {
            setStart(d);
            if (d.isAfter(end)) {
                setEnd(d.clone().add(1, 'hour'));
            }
        }
    };

    const handleEndChange = (d: moment.Moment | null) => {
        if (d && d.isValid() && d.isAfter(start)) {
            setEnd(d);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const inputTags = tags.map(
                (e): InputTimeSpanTag => ({key: e.tag.key, value: e.value}),
            );
            await addTimeSpan({
                variables: {
                    start: inUserTz(start).format(),
                    end: inUserTz(end).format(),
                    tags: inputTags,
                    note,
                },
            });
            setStep('result');
            enqueueSnackbar('Zeiteintrag erstellt', {variant: 'success'});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
            setStep('result');
        } finally {
            setLoading(false);
        }
    };

    const fmtDate = (m: moment.Moment) => m.format('DD.MM.YYYY');
    const fmtTime = (m: moment.Moment) => m.format('HH:mm');
    const durationStr = () => {
        const ms = end.diff(start);
        const h = Math.floor(ms / 3600000);
        const min = Math.round((ms % 3600000) / 60000);
        return `${h} h ${min.toString().padStart(2, '0')} min`;
    };

    return (
        <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
            <DialogTitle style={{textAlign: 'center', paddingBottom: 0}}>
                <span style={{fontWeight: 600}}>Sidy — Zeiteintrag</span>
            </DialogTitle>
            <DialogContent style={{paddingTop: 16, minHeight: 320}}>
                <SidyStepIndicator step={step === 'result' ? 4 : step} />

                {step === 1 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                        <Typography align="center" variant="subtitle1" style={{fontWeight: 500}}>
                            Schritt 1: Wählen Sie die Tags
                        </Typography>
                        <Paper style={{padding: 8}}>
                            <TagSelector
                                selectedEntries={tags}
                                onSelectedEntriesChanged={setTags}
                            />
                        </Paper>
                        <Typography variant="body2" color="textSecondary" align="center">
                            Geben Sie Tags ein, z.B. "Projekt:A" oder "Homeoffice"
                        </Typography>
                        <TextField
                            label="Notiz (optional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            multiline
                            rows={3}
                            variant="outlined"
                            fullWidth
                        />
                    </div>
                ) : null}

                {step === 2 ? (
                    <div style={dateTimeStyle}>
                        <Typography variant="subtitle1" style={{fontWeight: 500}}>
                            Schritt 2: Startzeit und Datum
                        </Typography>
                        <KeyboardDatePicker
                            label="Datum"
                            value={start}
                            onChange={handleStartChange}
                            format="DD.MM.YYYY"
                            InputProps={pickerInputProps}
                            style={pickerStyle}
                            animateYearScrolling
                        />
                        <KeyboardTimePicker
                            label="Uhrzeit"
                            value={start}
                            onChange={handleStartChange}
                            InputProps={pickerInputProps}
                            style={pickerStyle}
                        />
                    </div>
                ) : null}

                {step === 3 ? (
                    <div style={dateTimeStyle}>
                        <Typography variant="subtitle1" style={{fontWeight: 500}}>
                            Schritt 3: Endzeit und Datum
                        </Typography>
                        <KeyboardDatePicker
                            label="Datum"
                            value={end}
                            onChange={handleEndChange}
                            format="DD.MM.YYYY"
                            InputProps={pickerInputProps}
                            style={pickerStyle}
                            minDate={start}
                            animateYearScrolling
                        />
                        <KeyboardTimePicker
                            label="Uhrzeit"
                            value={end}
                            onChange={handleEndChange}
                            InputProps={pickerInputProps}
                            style={pickerStyle}
                        />
                    </div>
                ) : null}

                {step === 'result' ? (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24}}>
                        {error ? (
                            <>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    backgroundColor: '#fecaca',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <span style={{fontSize: 36, color: '#dc2626'}}>✗</span>
                                </div>
                                <Typography color="error" align="center">{error}</Typography>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    backgroundColor: '#bbf7d0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <span style={{fontSize: 36, color: '#16a34a'}}>✓</span>
                                </div>
                                <Typography variant="h6" style={{fontWeight: 600, color: '#16a34a'}}>
                                    Eintrag erfolgreich erstellt
                                </Typography>
                                <Paper style={{padding: 16, width: '100%', maxWidth: 320}}>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                        <div><strong>Tags:</strong> {tags.length > 0 ? tags.map(t => `${t.tag.key}:${t.value}`).join(', ') : '—'}</div>
                                        <div><strong>Start:</strong> {fmtDate(start)} {fmtTime(start)}</div>
                                        <div><strong>Ende:</strong> {fmtDate(end)} {fmtTime(end)}</div>
                                        <div><strong>Dauer:</strong> {durationStr()}</div>
                                        {note ? <div><strong>Notiz:</strong> {note}</div> : null}
                                    </div>
                                </Paper>
                            </>
                        )}
                        {loading ? <CircularProgress /> : null}
                    </div>
                ) : null}
            </DialogContent>
            <DialogActions style={{justifyContent: 'center', padding: '16px 24px'}}>
                {step === 1 ? (
                    <>
                        <Button onClick={onClose} color="default">Abbrechen</Button>
                        <Button variant="contained" color="primary" onClick={() => setStep(2)} disabled={tags.length === 0}>
                            Weiter
                        </Button>
                    </>
                ) : null}
                {step === 2 ? (
                    <>
                        <Button onClick={() => setStep(1)}>← Zurück</Button>
                        <Button variant="contained" color="primary" onClick={() => setStep(3)}>
                            Weiter
                        </Button>
                    </>
                ) : null}
                {step === 3 ? (
                    <>
                        <Button onClick={() => setStep(2)}>← Zurück</Button>
                        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={20} /> : 'Speichern'}
                        </Button>
                    </>
                ) : null}
                {step === 'result' ? (
                    <Button variant="contained" color="primary" onClick={onClose}>
                        OK
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
    );
};
