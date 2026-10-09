// 고정 요약(E9): 넓은 화면에서 요약의 아래 끝을 화면 아래(1.5rem 위)에 맞춘다. 페이지 맨 위에서는 요약이 머리글 아래에서
// 시작하므로 지금 위쪽 위치만큼 최대 높이를 줄인다. 그래서 화면 높이가 충분하면 맨 위에서도 생성·저장·불러오기 버튼이 보인다.
// 아주 낮은 화면에서는 CSS 의 하한(16rem) 때문에 맨 위에서 버튼이 화면 밖에 걸릴 수 있고, 조금 내리면 고정된다.
// 높이 규칙(lg 이상)과 하한은 CSS 가 정하고, 여기서는 위쪽 위치만 CSS 변수로 알린다(좁은 화면에서는 쓰이지 않는다).
const GAP = 24;
export function keepSummaryInView(aside) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const top = Math.max(aside.getBoundingClientRect().top, GAP);
    aside.style.setProperty('--summary-offset', `${Math.round(top + GAP)}px`);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  // 작업 영역이 보이게 되거나 내용 높이가 바뀌어 위치가 달라질 때도 다시 잰다.
  new ResizeObserver(schedule).observe(document.body);
  update();
}
