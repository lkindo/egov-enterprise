package nuri.business.service.board.dto;

import java.util.List;

/**
 * 게시판 내장 레이아웃(화면 유형) 템플릿 ID — 실제 화면을 정하는 값({@code tb_bbs_master.tmplt_id})이다.
 *
 * <p>[2026-10-26 ADR-0043 결정 5] 게시판 생성 요청은 이 일곱 값만 받는다. 종전에는 아무 문자열이나 받아, 화면이 그릴 수 없는
 * 템플릿으로 만든 게시판이 남았다(만든 뒤에는 바꿀 수 없다). 템플릿 원장의 참조 판정({@code BoardTemplateReferenceContributor})도
 * 같은 목록을 쓴다 — 목록은 이 클래스 하나다. 화면 쪽 정본 표는 {@code frontend/src/lib/board/board-types.ts} 다(DEC-OPS-332).
 */
public final class BoardLayoutIds {

    public static final String HUB = "TMPLT_HUB";
    public static final String LIST = "TMPLT_LIST";
    public static final String GALLERY = "TMPLT_GALLERY";
    public static final String QNA = "TMPLT_QNA";
    public static final String CALENDAR = "TMPLT_CALENDAR";
    public static final String FAQ = "TMPLT_FAQ";
    public static final String WIKI = "TMPLT_WIKI";

    /** 요청 검사용 정규식. 입력 계약 원장(enumBindings)의 순서와 같아야 한다. */
    public static final String PATTERN = "^(?:" + HUB + "|" + LIST + "|" + GALLERY + "|" + QNA + "|" + CALENDAR + "|" + FAQ
            + "|" + WIKI + ")$";

    /** 내장 레이아웃 일곱 개(선언 순서). */
    public static final List<String> ALL = List.of(HUB, LIST, GALLERY, QNA, CALENDAR, FAQ, WIKI);

    private BoardLayoutIds() {
    }
}
