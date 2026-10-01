const LIT = "#";

interface PixelIconProps {
  /** Rows joined by "/", "#" for a lit pixel, as the cartridge's pictures are kept. */
  readonly picture: string;
  readonly colour: string;
  readonly className?: string;
}

/** A cartridge picture drawn crisp at any size: one rectangle for each run of lit pixels. */
export function PixelIcon({ picture, colour, className }: PixelIconProps) {
  const rows = picture.split("/");
  return (
    <svg
      className={className}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        runsOf(row).map((run) => (
          <rect key={`${y}-${run.x}`} x={run.x} y={y} width={run.width} height={1} fill={colour} />
        )),
      )}
    </svg>
  );
}

interface Run {
  readonly x: number;
  readonly width: number;
}

function runsOf(row: string): Run[] {
  const runs: Run[] = [];
  [...row].forEach((pixel, x) => {
    const last = runs[runs.length - 1];
    if (pixel !== LIT) return;
    if (last && last.x + last.width === x)
      runs[runs.length - 1] = { x: last.x, width: last.width + 1 };
    else runs.push({ x, width: 1 });
  });
  return runs;
}
