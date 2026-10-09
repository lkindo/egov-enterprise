// 고정 요약(E9): 넓은 화면에서 요약의 아래 끝을 늘 화면 아래(1.5rem 위)에 맞춘다. 페이지 맨 위에서는 요약이 머리글 아래에서
// 시작하므로, 지금 위쪽 위치만큼 최대 높이를 줄여 생성·저장·불러오기 버튼이 화면 밖으로 밀리지 않게 한다. 높이 규칙(lg 이상)과
// 너무 낮은 화면의 하한은 CSS 가 정하고, 여기서는 위쪽 위치만 CSS 변수로 알린다(좁은 화면에서는 쓰이지 않는다).
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
