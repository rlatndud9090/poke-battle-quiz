import './App.css'

const CLUES = [
  { action: '땅 타입 물리 기술로 공격', result: 'x0', hint: '비행 타입? 부유 특성? 둘 중 하나' },
  { action: '전기 타입 특수 기술로 공격', result: 'x2', hint: '비행 타입 유력 (부유면 x1)' },
  { action: '아무 물리 기술로 공격', result: '방어 -1 · 스피드 +2', hint: '깨어진 갓옷!' },
]

function App() {
  return (
    <main className="app">
      <header className="app__header">
        <p className="app__eyebrow">DAILY · 하루 1회</p>
        <h1>Poke Battle Quiz</h1>
        <p className="app__tagline">
          오늘의 포켓몬을 <strong>배틀</strong>로 추론하라. 행동의 결과만 보고
          타입과 특성을 좁혀, 단 하나의 이름을 맞히면 된다.
        </p>
      </header>

      <section className="card">
        <h2>이렇게 플레이합니다</h2>
        <ol className="steps">
          <li>매 턴 하나의 <b>행동</b>을 고른다 — 예: <i>"불 타입 물리 기술로 공격"</i>.</li>
          <li>단순화된 <b>배틀 엔진</b>이 결과를 판정한다 — 데미지 배율, <code>x0</code> 무효, 능력 랭크 변화.</li>
          <li>단서로 <b>타입·특성</b>을 좁혀 정답 포켓몬을 추론한다.</li>
        </ol>
      </section>

      <section className="card">
        <h2>예시 배틀 로그</h2>
        <ul className="log">
          {CLUES.map((clue, index) => (
            <li key={clue.action} className="log__row">
              <span className="log__turn">T{index + 1}</span>
              <span className="log__action">{clue.action}</span>
              <span className="log__result">{clue.result}</span>
              <span className="log__hint">{clue.hint}</span>
            </li>
          ))}
        </ul>
        <p className="card__note">
          ※ 수치는 컨셉 예시입니다. 실제 배틀 규칙·정답 은닉·힌트 범위는 후속 피처 브랜치에서 설계합니다.
        </p>
      </section>

      <footer className="app__footer">
        <span className="badge">🛠 초기 부트스트랩 — 배틀 엔진 준비 중</span>
      </footer>
    </main>
  )
}

export default App
