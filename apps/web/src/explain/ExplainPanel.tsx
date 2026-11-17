import type { Trace } from '@mateo/engine';
import type { ExplainSequence, Timeline } from '@mateo/explain';
import { ExplainError, buildTimeline, sequenceFor } from '@mateo/explain';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mateo/ui';
import { BookOpenText, ListOrdered } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExplainPlayer } from './ExplainPlayer';
import { StoryView } from './StoryView';

export interface Explanation {
  readonly sequence: ExplainSequence;
  readonly timeline: Timeline;
}

/**
 * The animated explanation of a stored trace, or `null` when its method has no explain
 * sequence or the trace was written by a version
 * of the method whose steps the sequence does not know.
 */
export function explanationOf(trace: Trace): Explanation | null {
  const sequence = sequenceFor(trace.methodId);
  if (!sequence) return null;
  try {
    return { sequence, timeline: buildTimeline(trace, sequence) };
  } catch (error) {
    if (error instanceof ExplainError) return null;
    throw error;
  }
}

/** Explain mode of one analysis: the step-by-step player and the story of the result. */
export function ExplainPanel({ trace, explanation }: { trace: Trace; explanation: Explanation }) {
  const { t } = useTranslation('explain');
  const { sequence, timeline } = explanation;
  const story = useMemo(() => sequence.story, [sequence]);
  return (
    <Tabs defaultValue="timeline" className="space-y-4" data-testid="explain-panel">
      <TabsList aria-label={t('panel.label')}>
        <TabsTrigger value="timeline" data-testid="explain-tab-timeline">
          <ListOrdered aria-hidden />
          {t('panel.timeline')}
        </TabsTrigger>
        {story && (
          <TabsTrigger value="story" data-testid="explain-tab-story">
            <BookOpenText aria-hidden />
            {t('panel.story')}
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="timeline">
        <ExplainPlayer trace={trace} timeline={timeline} />
      </TabsContent>
      {story && (
        <TabsContent value="story">
          <StoryView trace={trace} plan={story} />
        </TabsContent>
      )}
    </Tabs>
  );
}
