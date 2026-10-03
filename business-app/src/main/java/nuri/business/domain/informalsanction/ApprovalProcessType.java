package nuri.business.domain.informalsanction;

/**
 * 결재 처리 이력의 종류(2026-10-03 결재 동선 개선 D6·D7).
 *
 * <ul>
 *   <li>{@code REPLACE} — 기안자가 아직 처리하지 않은 결재자를 다른 사람으로 바꿨다(앞 단계 승인은 그대로).</li>
 *   <li>{@code ASK} — 결재자가 반려하지 않고 기안자에게 보완을 요청했다.</li>
 *   <li>{@code ANSWER} — 기안자가 보완 요청에 답했다. 같은 결재자 차례로 돌아간다.</li>
 *   <li>{@code REVISE} — 기안자가 보완 답변과 함께 제목·본문을 고쳤다. 고치기 전 본문을 남긴다.</li>
 *   <li>{@code REMIND} — 기안자가 차례인 결재자에게 재알림을 보냈다(하루 한 번).</li>
 * </ul>
 */
public enum ApprovalProcessType {
    REPLACE, ASK, ANSWER, REVISE, REMIND
}
