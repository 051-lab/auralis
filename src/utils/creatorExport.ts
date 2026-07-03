import type { CreatorSessionState } from '@/store/useAuralisStore';

export interface CreatorExportDraftInput {
  creatorSession: CreatorSessionState;
  presetName: string;
  recordingModeLabel: string;
  isBinauralMode: boolean;
  headphonesRecommended: boolean;
}

export interface CreatorExportDraft {
  title: string;
  durationLabel: string;
  fileNameStem: string;
  description: string;
  tags: string[];
  checklist: string[];
  copyText: string;
}

const compactText = (value: string, fallback: string): string => {
  const trimmedValue = value.trim();
  return trimmedValue || fallback;
};

export function createCreatorSlug(value: string, fallback: string = 'auralis-session'): string {
  const sourceValue = value.trim() || fallback;
  const slug = sourceValue
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return slug || 'auralis-session';
}

export function formatCreatorDuration(minutes: number): string {
  const safeMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${safeMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

export function buildCreatorExportDraft(input: CreatorExportDraftInput): CreatorExportDraft {
  const title = compactText(input.creatorSession.title, input.presetName);
  const purpose = compactText(input.creatorSession.purpose, 'Relaxation sound session');
  const visualTheme = compactText(
    input.creatorSession.visualTheme,
    'Dark cyan/violet audio visualizer'
  );
  const notes = input.creatorSession.notes.trim();
  const storyboardNotes = input.creatorSession.storyboardNotes.trim();
  const durationLabel = formatCreatorDuration(input.creatorSession.durationMinutes);
  const fileNameStem = createCreatorSlug(input.creatorSession.exportSlug, title);
  const tags = [
    'auralis',
    'ambient audio',
    purpose.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  ].filter(Boolean);
  const checklist = [
    'Start at low listening volume before recording.',
    'Watch the output meter for sustained hot or limiter-active levels.',
    `Record or assemble a ${durationLabel} session from clean captured sections.`,
    'Record at least 10 seconds of clean head and tail room.',
    input.isBinauralMode || input.headphonesRecommended
      ? 'Mention that stereo headphones are recommended for this session.'
      : 'Confirm the session still feels balanced on speakers and headphones.',
  ];
  const descriptionLines = [
    `${title} is an Auralis sound session intended for ${purpose.toLowerCase()}.`,
    `Current preset: ${input.presetName}.`,
    `Target duration: ${durationLabel}.`,
    `Recording target: ${input.recordingModeLabel}.`,
    `Visual direction: ${visualTheme}.`,
    notes ? `Session notes: ${notes}` : '',
    storyboardNotes ? `Storyboard notes: ${storyboardNotes}` : '',
    'Auralis is not medical software. Effects are not guaranteed; listen comfortably and stop if the sound feels uncomfortable.',
  ].filter(Boolean);
  const copyText = [
    `Title: ${title}`,
    '',
    'Description:',
    descriptionLines.join('\n'),
    '',
    `Filename stem: ${fileNameStem}`,
    `Target duration: ${durationLabel}`,
    '',
    `Tags: ${tags.join(', ')}`,
    '',
    'Pre-export checklist:',
    ...checklist.map((item) => `- ${item}`),
  ].join('\n');

  return {
    title,
    durationLabel,
    fileNameStem,
    description: descriptionLines.join('\n'),
    tags,
    checklist,
    copyText,
  };
}
