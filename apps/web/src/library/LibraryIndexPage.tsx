import { sequenceFor } from '@mateo/explain';
import { Badge } from '@mateo/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { pathOf } from '../navigation/navigation';
import { PageHeader } from '../routes/PageHeader';
import { FUZZY_LESSON_STEPS } from '../tfn/fuzzyLessonSteps';
import { LIBRARY_PAGES, libraryPath, type LibraryPage } from './methods';

/** The questions Learn answers, in the order of the decision path. */
const TOPICS = ['weighting', 'ranking', 'fuzzy'] as const;
type Topic = (typeof TOPICS)[number];

interface LessonLink {
  readonly id: string;
  readonly to: string;
  readonly title: string;
  /** Number of steps, or `null` for something that is not a lesson. */
  readonly steps: number | null;
}

/**
 * The steps of a method page's first lesson. A sample is named after its method, so the id
 * finds the sequence without loading the sample data (library.test checks this).
 */
function stepsOf(page: LibraryPage): number {
  return sequenceFor(page.variants[0]!.sampleId)?.lesson.length ?? 0;
}

/** Learn: three questions, each with its lessons. */
export function LibraryIndexPage() {
  const { t } = useTranslation(['library', 'nav']);
  const lessonsOf = (topic: Topic): LessonLink[] =>
    topic === 'fuzzy'
      ? [
          {
            id: 'fuzzy',
            to: pathOf('fuzzyLesson'),
            title: t('nav:items.fuzzyLesson.title'),
            steps: FUZZY_LESSON_STEPS.length,
          },
          {
            id: 'playground',
            to: pathOf('playground'),
            title: t('nav:items.playground.title'),
            steps: null,
          },
        ]
      : LIBRARY_PAGES.filter((page) => page.family === topic).map((page) => ({
          id: page.id,
          to: libraryPath(page.id),
          title: t(`library:pages.${page.id}.title`),
          steps: stepsOf(page),
        }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('nav:items.library.title')}
        description={t('nav:items.library.description')}
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {TOPICS.map((topic) => (
          <li
            key={topic}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
            data-testid={`learn-topic-${topic}`}
          >
            <Badge variant="accent" className="self-start">
              {t(`library:home.${topic}.where`)}
            </Badge>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-balance">
                {t(`library:home.${topic}.question`)}
              </h2>
              <p className="text-sm text-muted-foreground">{t(`library:home.${topic}.text`)}</p>
            </div>
            <ul className="mt-auto flex flex-col gap-1.5">
              {lessonsOf(topic).map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    to={lesson.to}
                    data-testid={`library-card-${lesson.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span>{lesson.title}</span>
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground group-hover:text-accent-foreground">
                      {lesson.steps === null
                        ? t('library:home.tryIt')
                        : t('library:home.steps', { count: lesson.steps })}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
