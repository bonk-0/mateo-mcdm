/**
 * English texts for the keys this package emits (ICU message format): error messages
 * (`ProjectError.messageKey`, with `ProjectError.details` as values) and the labels of
 * undoable commands (`Command.labelKey`). English is the source language; `tr.ts` must
 * define exactly the same keys.
 */
export const en = {
  'project.error.NOT_A_PROJECT_FILE': 'This file is not a Mateo project.',
  'project.error.NEWER_SCHEMA':
    'This project was saved with a newer version of Mateo (file format {fileVersion, number}; this version reads up to {supportedVersion, number}). Update Mateo to open it. The file was not changed.',
  'project.error.CORRUPT_FILE': 'This project file is damaged and cannot be opened.',
  'project.error.MIGRATION_FAILED':
    'This project could not be upgraded to the current file format. The file was not changed.',
  'project.error.LOCATION_NOT_EMPTY': 'A file already exists at this location.',
  'project.error.NOT_FOUND': 'The file or item could not be found.',
  'project.error.IN_USE':
    'This project is open in another tab or window. Close it there, or continue in that tab.',
  'project.error.PROJECT_CLOSED': 'The project is closed.',
  'project.error.INVALID_ARGUMENT': 'This change cannot be stored in the project.',
  'project.error.STORAGE_FAILED':
    'The project could not be read or written. Check that the file is accessible and that there is enough free space.',

  'project.command.dataset.add': 'Add dataset',
  'project.command.dataset.update': 'Edit dataset',
  'project.command.dataset.remove': 'Delete dataset',
  'project.command.dataset.move': 'Move dataset',
  'project.command.criterion.add': 'Add criterion',
  'project.command.criterion.update': 'Edit criterion',
  'project.command.criterion.remove': 'Delete criteria',
  'project.command.criterion.move': 'Move criterion',
  'project.command.alternative.add': 'Add alternative',
  'project.command.alternative.update': 'Edit alternative',
  'project.command.alternative.remove': 'Delete alternatives',
  'project.command.alternative.move': 'Move alternative',
  'project.command.matrix.add': 'Add matrix',
  'project.command.matrix.rename': 'Rename matrix',
  'project.command.matrix.remove': 'Delete matrix',
  'project.command.cells.set': 'Edit cells',
  'project.command.scale.put': 'Edit linguistic scale',
  'project.command.scale.remove': 'Delete linguistic scale',
} as const;

export type ProjectMessageKey = keyof typeof en;
