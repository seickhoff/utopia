import type { Step, StepStatus, StepTurn } from "./steps.js";

/** One piece of business, step by step: given up as soon as a step can no longer be taken. */
export class Errand {
  private next = 0;

  constructor(private readonly steps: readonly Step[]) {}

  static none(): Errand {
    return new Errand([]);
  }

  carryOn(turn: StepTurn): void {
    const step = this.steps[this.next];
    if (step === undefined) return;
    step.act(turn);
    this.moveOn(step.status());
  }

  isOver(): boolean {
    return this.next >= this.steps.length;
  }

  private moveOn(status: StepStatus): void {
    if (status === "done") this.next += 1;
    if (status === "abandoned") this.next = this.steps.length;
  }
}
