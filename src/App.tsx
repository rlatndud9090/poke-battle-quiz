import { useDeferredValue, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { POKEMON_TYPES } from "./data";
import {
  createPanelGameRuntime,
  eligibleCandidates,
  findExactCandidate,
  formatTypeMultiplier,
  getPanelMetadata,
  getTypePanelMultiplier,
  openPanel,
  savePanelSession,
  searchEligibleCandidates,
  submitGuess,
  toPanelGameView,
  type PanelGameAnswer,
  type PanelId,
  type TitleAvailabilityKey,
} from "./panel-game";

const TYPE_LABELS: Record<(typeof POKEMON_TYPES)[number], string> = {
  normal: "노말",
  fire: "불꽃",
  water: "물",
  electric: "전기",
  grass: "풀",
  ice: "얼음",
  fighting: "격투",
  poison: "독",
  ground: "땅",
  flying: "비행",
  psychic: "에스퍼",
  bug: "벌레",
  rock: "바위",
  ghost: "고스트",
  dragon: "드래곤",
  dark: "악",
  steel: "강철",
  fairy: "페어리",
};

const STATIC_PANELS: Array<{ id: PanelId; label: string; hint: string }> = [
  { id: "low-kick", label: "안다리걸기", hint: "체중 구간" },
  { id: "beast-boost", label: "비스트부스트", hint: "최고 능력치" },
  { id: "eviolite", label: "진화의휘석", hint: "추가 진화 가능" },
  { id: "mega-stone", label: "메가스톤", hint: "메가진화 존재" },
  { id: "gmax", label: "다이맥스", hint: "거다이맥스 존재" },
  { id: "title-swsh", label: "SwSh", hint: "소드·실드" },
  { id: "title-la", label: "LA", hint: "레전드 아르세우스" },
  { id: "title-sv", label: "SV", hint: "스칼렛·바이올렛" },
  { id: "title-za", label: "ZA", hint: "레전드 Z-A" },
];

function createAppState() {
  return createPanelGameRuntime();
}

function getStaticPanelValue(answer: PanelGameAnswer, panelId: PanelId): string {
  const metadata = getPanelMetadata(answer.candidate.id);

  switch (panelId) {
    case "low-kick":
      return String(metadata.lowKickPower);
    case "beast-boost":
      return metadata.beastBoost;
    case "eviolite":
      return metadata.evioliteEligible ? "O" : "X";
    case "mega-stone":
      return metadata.hasMegaEvolution ? "O" : "X";
    case "gmax":
      return metadata.hasGigantamax ? "O" : "X";
    case "title-swsh":
      return titleFlag(metadata.titleAvailability.swsh);
    case "title-la":
      return titleFlag(metadata.titleAvailability.la);
    case "title-sv":
      return titleFlag(metadata.titleAvailability.sv);
    case "title-za":
      return titleFlag(metadata.titleAvailability.za);
    default:
      return "";
  }
}

function titleFlag(value: boolean) {
  return value ? "O" : "X";
}

function titleAvailabilityLabel(key: TitleAvailabilityKey) {
  return { swsh: "SwSh", la: "LA", sv: "SV", za: "ZA" }[key];
}

function getPanelValue(answer: PanelGameAnswer, panelId: PanelId) {
  if (POKEMON_TYPES.includes(panelId as (typeof POKEMON_TYPES)[number])) {
    return formatTypeMultiplier(getTypePanelMultiplier(answer, panelId as (typeof POKEMON_TYPES)[number]));
  }
  return getStaticPanelValue(answer, panelId);
}

function App() {
  const [{ answer, persistenceMode, initialSession }] = useState(() => {
    const runtime = createAppState();
    return {
      answer: runtime.answer,
      persistenceMode: runtime.persistenceMode,
      initialSession: runtime.session,
    };
  });
  const [session, setSession] = useState(initialSession);
  const [query, setQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const view = toPanelGameView(session, answer);
  const deferredQuery = useDeferredValue(query);
  const results = searchEligibleCandidates(deferredQuery);

  function commit(nextSession: typeof session) {
    savePanelSession(nextSession);
    setSession(nextSession);
  }

  function handleOpenPanel(panelId: PanelId) {
    commit(openPanel(session, panelId));
  }

  function handleSubmitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCandidate =
      eligibleCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? findExactCandidate(query);
    if (!selectedCandidate) return;

    const nextSession = submitGuess(
      session,
      { candidateId: selectedCandidate.id, nameKo: selectedCandidate.nameKo },
      answer,
    );
    commit(nextSession);
    setQuery("");
    setSelectedCandidateId(null);
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">DAILY PANEL PUZZLE</p>
          <h1>Poke Battle Quiz</h1>
          <p className="hero__lead">
            패널을 뒤집어 정보를 사고, 오늘의 포켓몬을 12번 안에 맞히세요.
          </p>
        </div>
        <div className="hero__stats">
          <StatChip label="날짜" value={view.gameDate} />
          <StatChip label="점수" value={String(view.moveCount)} />
          <StatChip label="남은 횟수" value={String(view.remainingMoves)} />
          <StatChip label="상태" value={view.status} />
        </div>
      </header>

      {persistenceMode === "memory" ? (
        <p className="notice">브라우저 저장소에 접근할 수 없어 이 탭 안에서만 진행 상태를 유지합니다.</p>
      ) : null}

      <section className="workspace">
        <section className="panel-area">
          <div className="section-head">
            <div>
              <p className="section-head__eyebrow">Hint Panels</p>
              <h2>패널 보드</h2>
            </div>
            <p className="section-head__meta">
              열린 패널 {view.openedPanels.length} / {POKEMON_TYPES.length + STATIC_PANELS.length}
            </p>
          </div>

          <div className="panel-grid">
            {POKEMON_TYPES.map((type) => (
              <PanelCard
                key={type}
                isOpen={view.openedPanels.includes(type)}
                disabled={view.status !== "진행"}
                label={TYPE_LABELS[type]}
                hint="방어 상성"
                value={getPanelValue(answer, type)}
                onClick={() => handleOpenPanel(type)}
              />
            ))}
            {STATIC_PANELS.map((panel) => (
              <PanelCard
                key={panel.id}
                isOpen={view.openedPanels.includes(panel.id)}
                disabled={view.status !== "진행"}
                label={panel.label}
                hint={panel.hint}
                value={getPanelValue(answer, panel.id)}
                onClick={() => handleOpenPanel(panel.id)}
              />
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <section className="card">
            <div className="section-head">
              <div>
                <p className="section-head__eyebrow">Guess</p>
                <h2>이름 추측</h2>
              </div>
            </div>
            <form className="guess-form" onSubmit={handleSubmitGuess}>
              <label className="guess-label" htmlFor="candidate-search">
                후보 검색
              </label>
              <input
                id="candidate-search"
                className="guess-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedCandidateId(null);
                }}
                placeholder="이름, 영어, 초성으로 검색"
                disabled={view.status !== "진행"}
              />
              <div className="guess-results" role="listbox" aria-label="후보 목록">
                {results.length === 0 ? (
                  <p className="guess-empty">검색 결과가 없습니다.</p>
                ) : (
                  results.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={selectedCandidateId === candidate.id ? "guess-option guess-option--active" : "guess-option"}
                      onClick={() => {
                        setSelectedCandidateId(candidate.id);
                        setQuery(candidate.nameKo);
                      }}
                    >
                      <span>{candidate.nameKo}</span>
                      <small>{candidate.nameEn}</small>
                    </button>
                  ))
                )}
              </div>
              <button className="guess-submit" type="submit" disabled={view.status !== "진행"}>
                이 포켓몬으로 추측
              </button>
            </form>
          </section>

          <section className="card">
            <div className="section-head">
              <div>
                <p className="section-head__eyebrow">Attempts</p>
                <h2>추측 이력</h2>
              </div>
            </div>
            <ul className="guess-log">
              {view.guesses.length === 0 ? (
                <li className="guess-log__empty">아직 이름 추측을 하지 않았습니다.</li>
              ) : (
                view.guesses.map((guess, index) => (
                  <li key={`${guess.candidateId}-${index}`} className="guess-log__row">
                    <span>{guess.nameKo}</span>
                    <strong>{guess.correct ? "정답" : "오답"}</strong>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="card">
            <div className="section-head">
              <div>
                <p className="section-head__eyebrow">Result</p>
                <h2>결과</h2>
              </div>
            </div>
            {view.revealed ? (
              <div className="result">
                <p className="result__status">{view.status === "해결" ? "정답!" : "실패"}</p>
                <h3>{view.revealed.nameKo}</h3>
                <p>특성: {humanizeAbilityId(view.revealed.abilityId)}</p>
                <p>타입: {view.revealed.types.map((type) => TYPE_LABELS[type]).join(" / ")}</p>
                <div className="result__titles">
                  {(["swsh", "la", "sv", "za"] as TitleAvailabilityKey[]).map((key) => (
                    <span key={key}>
                      {titleAvailabilityLabel(key)} {titleFlag(getPanelMetadata(view.revealed!.candidateId).titleAvailability[key])}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="result__waiting">정답을 맞히거나 12회를 모두 사용하면 결과가 공개됩니다.</p>
            )}
          </section>
        </aside>
      </section>

      <footer className="footer">
        <p className="footer__legal">
          Pokémon 및 포켓몬 캐릭터 명칭은 Nintendo의 상표입니다. © 1995–2026 Nintendo / Creatures Inc. / GAME FREAK inc.
        </p>
      </footer>
    </main>
  );
}

function PanelCard(props: {
  label: string;
  hint: string;
  value: string;
  isOpen: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { label, hint, value, isOpen, disabled, onClick } = props;

  return (
    <button className={isOpen ? "panel-card panel-card--open" : "panel-card"} type="button" onClick={onClick} disabled={disabled}>
      <span className="panel-card__face panel-card__face--front">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className="panel-card__face panel-card__face--back">
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </button>
  );
}

function StatChip(props: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function humanizeAbilityId(abilityId: string) {
  return abilityId
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default App;
