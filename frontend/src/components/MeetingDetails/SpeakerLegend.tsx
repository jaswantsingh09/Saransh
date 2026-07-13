'use client';

import { SpeakerColor } from '@/hooks/useSpeakerLabels';

interface SpeakerLegendProps {
  names: string[];
  colorForName: (name: string) => SpeakerColor;
}

/**
 * Compact chips listing the speakers Voice ID identified for a meeting.
 * Shown above the transcript so reviewers can see who was in the room at a glance.
 */
export function SpeakerLegend({ names, colorForName }: SpeakerLegendProps) {
  if (names.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 mr-0.5">Speakers:</span>
      {names.map((name) => {
        const color = colorForName(name);
        return (
          <span
            key={name}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
            {name}
          </span>
        );
      })}
    </div>
  );
}
