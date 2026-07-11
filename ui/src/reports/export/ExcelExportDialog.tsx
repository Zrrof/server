import * as React from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    IconButton,
    Typography,
    Paper,
} from '@material-ui/core';
import {Add, Delete, Edit} from '@material-ui/icons';
import {ExportSettings, loadSettings, saveSettings} from './excelSettings';
import {generateFromTemplate} from './excel';
import {ReportTimeSpan} from '../types';

interface Props {
    entries: ReportTimeSpan[];
    onClose: () => void;
}

export const ExcelExportDialog: React.FC<Props> = ({entries, onClose}) => {
    const [settings, setSettings] = React.useState<ExportSettings>(loadSettings);
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [editTag, setEditTag] = React.useState('');
    const [editSymbol, setEditSymbol] = React.useState('');
    const [exporting, setExporting] = React.useState(false);

    const updateField = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
        setSettings((prev) => ({...prev, [key]: value}));
    };

    const handleStartAdd = () => {
        setEditingIndex(-1);
        setEditTag('');
        setEditSymbol('');
    };

    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setEditTag(settings.symbolMappings[index].tag);
        setEditSymbol(settings.symbolMappings[index].symbol);
    };

    const handleDelete = (index: number) => {
        setSettings((prev) => ({
            ...prev,
            symbolMappings: prev.symbolMappings.filter((_, i) => i !== index),
        }));
    };

    const handleSaveMapping = () => {
        if (!editTag.trim() || !editSymbol.trim()) {
            return;
        }
        setSettings((prev) => {
            const mappings = [...prev.symbolMappings];
            if (editingIndex === -1) {
                mappings.push({tag: editTag.trim(), symbol: editSymbol.trim()});
            } else if (editingIndex !== null) {
                mappings[editingIndex] = {tag: editTag.trim(), symbol: editSymbol.trim()};
            }
            return {...prev, symbolMappings: mappings};
        });
        setEditingIndex(null);
        setEditTag('');
        setEditSymbol('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditTag('');
        setEditSymbol('');
    };

    const handleExport = async () => {
        if (settings.saveSettings) {
            saveSettings(settings);
        }
        setExporting(true);
        try {
            await generateFromTemplate(entries, settings);
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    const editing = editingIndex !== null;

    return (
        <Dialog open maxWidth="md" fullWidth onClose={onClose}>
            <DialogTitle>Excel Export - Arbeitszeitnachweis</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" gutterBottom>
                    Persönliche Daten
                </Typography>
                <TextField
                    label="Name"
                    fullWidth
                    margin="dense"
                    value={settings.name}
                    onChange={(e) => updateField('name', e.target.value)}
                />
                <TextField
                    label="Organisationseinheit / Abteilung"
                    fullWidth
                    margin="dense"
                    value={settings.department}
                    onChange={(e) => updateField('department', e.target.value)}
                />

                <Typography variant="subtitle1" gutterBottom style={{marginTop: 16}}>
                    Arbeitszeit
                </Typography>
                <TextField
                    label="Monatsstunden (Sollarbeitszeit)"
                    type="number"
                    fullWidth
                    margin="dense"
                    value={settings.monthlyHours}
                    onChange={(e) => updateField('monthlyHours', Number(e.target.value))}
                    inputProps={{min: 0, step: 0.5}}
                />
                <TextField
                    label="Arbeitstage pro Woche"
                    type="number"
                    fullWidth
                    margin="dense"
                    value={settings.workDaysPerWeek}
                    onChange={(e) => updateField('workDaysPerWeek', Number(e.target.value))}
                    inputProps={{min: 1, max: 7}}
                />

                <Typography variant="subtitle1" gutterBottom style={{marginTop: 16}}>
                    Kürzel (Tag → Symbol)
                </Typography>
                <Paper style={{marginBottom: 8}}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tag</TableCell>
                                <TableCell>Kürzel</TableCell>
                                <TableCell align="right" style={{width: 120}}>
                                    <Button size="small" startIcon={<Add />} onClick={handleStartAdd}>
                                        Hinzufügen
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {settings.symbolMappings.map((mapping, index) => (
                                <TableRow key={index}>
                                    <TableCell>{mapping.tag}</TableCell>
                                    <TableCell>{mapping.symbol}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleStartEdit(index)}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(index)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                {editing && (
                    <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8}}>
                        <TextField
                            label="Tag"
                            value={editTag}
                            onChange={(e) => setEditTag(e.target.value)}
                            style={{width: 200}}
                        />
                        <TextField
                            label="Kürzel"
                            value={editSymbol}
                            onChange={(e) => setEditSymbol(e.target.value)}
                            style={{width: 120}}
                        />
                        <Button variant="contained" size="small" onClick={handleSaveMapping}>
                            {editingIndex === -1 ? 'Hinzufügen' : 'Speichern'}
                        </Button>
                        <Button size="small" onClick={handleCancelEdit}>
                            Abbrechen
                        </Button>
                    </div>
                )}

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={settings.saveSettings}
                            onChange={(e) => updateField('saveSettings', e.target.checked)}
                        />
                    }
                    label="Einstellungen dauerhaft speichern"
                    style={{marginTop: 8}}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={exporting}>
                    Abbrechen
                </Button>
                <Button variant="contained" color="primary" onClick={handleExport} disabled={exporting}>
                    {exporting ? 'Exportiere...' : 'Excel exportieren'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
