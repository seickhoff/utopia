import type { ScreenProps } from "./App.js";
import { ReportTable } from "./YearEndPanel.js";

export function FinalScreen({ view, actions }: ScreenProps) {
  return (
    <div className="final-screen">
      <section className="final-card">
        <h2>{view.final.headline}</h2>
        <ReportTable lines={view.final.lines} />
        <div className="final-actions">
          <button className="take-office" onClick={actions.play}>
            Run again
          </button>
          <button onClick={actions.backToTitle}>Title</button>
        </div>
      </section>
    </div>
  );
}
