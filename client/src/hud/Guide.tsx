import { ITEM_KINDS, keyOf, priceOf, type ItemKind } from "@utopia/engine";
import { ITEM_NAMES } from "./hud-presenter.js";

/** What each item does, as the cartridge's sums have it (see docs/reference/mechanics.md). */
const ITEM_ROLES: Readonly<Record<ItemKind, string>> = {
  fort: "Guards the squares around it from rebels, and your boats nearby from pirates.",
  factory: "Makes 4 gold a year, more beside schools and hospitals, but raises the death rate.",
  crop: "Feeds your people. Weather passing over it earns gold. Each has a 1 in 3 chance to wither at year end.",
  school: "A point every year, and busier factories, but fewer births.",
  hospital: "A point every year, more births and fewer deaths, and busier factories.",
  house: "Houses your people for the housing score, and a few more births.",
  rebel: "Lands on the rival's island and wrecks what stands there, unless a fort is near.",
  ptBoat: "Sail it to sink the rival's fishing boats, and to stop pirates dead.",
  fishingBoat: "Feeds your people and makes a gold bar a year. Fish caught earn more.",
};

const SECTIONS: readonly { readonly title: string; readonly lines: readonly string[] }[] = [
  {
    title: "The year",
    lines: [
      "A year lasts the turn length you chose. At its end each island gets 10 gold plus what its factories and fishing boats make, people are born and die, and the year is scored out of 100 on housing, food, wealth per head, schools and hospitals.",
      "If your score drops by 10 or more, or stays under 30, rebels rise on your island. If it climbs by 10 or more, or reaches 70, one leaves.",
    ],
  },
  {
    title: "Weather and the sea",
    lines: [
      "Rain, storms and hurricanes drift across the sea. Storms and hurricanes wear down what they pass over until it is destroyed, and a hurricane sinks any boat under way that it touches.",
      "Pirates sink fishing boats unless a fort is close by. Schools of fish wander through: a fishing boat over them, sailing or anchored, earns gold.",
    ],
  },
  {
    title: "With the mouse",
    lines: [
      "Click your own empty land for the build ring. Head toward a choice and click, or press, drag and let go.",
      "Click your anchored boat to take it out. It follows the pointer; click open water to sail there and drop anchor. A right click clears.",
    ],
  },
  {
    title: "With the keys",
    lines: [
      "Arrows or WASD move · 1–9 choose · Enter builds · 0 or Space takes out or anchors a boat · Esc clears.",
      "Hold T, C or R for both islands' total, census or last year's score · V 3D view · M sound · L labels.",
    ],
  },
  {
    title: "The screen",
    lines: [
      "Along the bottom: your gold (green, left), years left, seconds left, and the rival's gold (red, right). Turn on Labels to have the border name them. Hold TOTAL, CENSUS or ROUND on the left bar to show those figures in the gold corners instead, named beneath while you hold.",
    ],
  },
];

/** How to play, in short: the goal, what each item does, the year, the sea, and the controls. */
export function Guide() {
  return (
    <div className="guide">
      <p className="guide-goal">
        Govern your island for your term of office. Each year is scored on how well your people
        live, and the higher total at the end wins.
      </p>
      <ItemRoles />
      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          {section.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

function ItemRoles() {
  return (
    <section>
      <h3>What to build</h3>
      <dl className="guide-items">
        {ITEM_KINDS.map((kind) => (
          <div key={kind}>
            <dt>
              {keyOf(kind)} · {ITEM_NAMES[kind]} <span>{priceOf(kind)} gold</span>
            </dt>
            <dd>{ITEM_ROLES[kind]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
