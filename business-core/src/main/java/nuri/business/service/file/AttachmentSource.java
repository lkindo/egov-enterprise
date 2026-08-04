package nuri.business.service.file;

import java.util.Arrays;
import java.util.List;

/**
 * 🔒 첨부 도달성(reachability) 판정용 <b>참조원 레지스트리</b>.
 *
 * <p>[왜 필요한가] {@code tb_file_master} 는 소유 도메인을 모른다 — 첨부는 {@code atch_file_id} 라는
 * 문자열 하나로만 업무 행(row)과 이어져 있고 FK 도 없다. 그래서 "이 첨부를 이 사용자가 봐도 되는가" 는
 * 파일 자신이 답할 수 없고, <b>그 첨부를 참조하는 업무 행을 그 사용자가 읽을 수 있는가</b> 로만 답할 수 있다.
 * 이 enum 이 그 역참조 지도다.
 *
 * <p>[실측 근거 · 2026-08-04] {@code information_schema} 전수 조회로 {@code atch_file_id} 컬럼을 가진
 * 테이블은 {@code tb_file_master}/{@code tb_file_detail} 을 제외하면 정확히 13종이며, 코드의
 * {@code atchFileId} 보유 엔티티 13종과 1:1 로 대응한다. <b>여기에 {@link #POPUP} 하나가 더 붙어 14종이다</b> —
 * 팝업만 전용 컬럼이 아니라 {@code file_url} 문자열로 첨부를 참조하기 때문에 컬럼 기준 census 에
 * 잡히지 않았다. 이 대응은 {@code AttachmentSourceRegistryLinterTest} 가 기계로 고정한다 —
 * 신규 도메인이 첨부를 갖는데 여기 등록되지 않으면 pre-push 가 red 다.
 *
 * <p><b>⚠ 누락의 증상은 '뚫림' 이 아니라 '잠김' 이다.</b> 등록되지 않은 참조원은 어떤 근거도 만들지
 * 못하므로(fail-closed) 정상 사용자가 403 을 맞는다. 실제로 팝업 누락은 대시보드 팝업 이미지가
 * 업로더 외 전원에게 403 이 되는 형태로 나타났고, 컴파일·단위 테스트는 전부 그린이었으며
 * <b>E2E({@code 05-public-experience})가 잡았다</b>. 참조 형태를 컬럼 이름으로 가정하지 말 것.
 *
 * <p><b>⚠ 신원 축(identity axis)</b> — 이 저장소의 상습 함정이라 컬럼별로 실측해 고정했다.
 * <ul>
 *   <li>{@code frst_rgtr_id} = <b>loginId</b> (모든 테이블 공통. {@code BaseEntity} · {@code LoginUserAuditorAware})</li>
 *   <li>{@code tb_bbs_item.user_id} = <b>esntlId</b> (실측값 {@code USRCNFRM_…})</li>
 *   <li>{@code tb_note_sndng.sndr_id} · {@code tb_note_rcptn.rcvr_id} = <b>esntlId</b>
 *       ({@code NoteApiController} 가 {@code userDetails.getUsername()} 을 넘긴다)</li>
 * </ul>
 * 축을 섞으면 잠김(정상 사용자 403) 또는 뚫림(타인 첨부 열람)이 되므로 새 참조원 추가 시 반드시 실측한다.
 */
public enum AttachmentSource {

    /**
     * 레이어 팝업. <b>유일하게 {@code atch_file_id} 가 아니라 URL 문자열로 첨부를 참조한다</b> —
     * {@code tb_popup_info.file_url} 에 {@code /api/v1/files/{id}} 형태를 저장한다.
     *
     * <p>[놓쳤던 이유 · 2026-08-04] 최초 census 를 {@code atch_file_id} <b>컬럼 기준</b>으로 돌려
     * 이 도메인이 통째로 보이지 않았다. 그 결과 팝업 이미지가 업로더(관리자) 외에는 403 이 되어
     * 대시보드 팝업이 사용자에게 깨져 보였다 — E2E `05-public-experience` 가 잡았다.
     * 참조 형태를 컬럼 이름으로 가정한 것이 오류였고, 그래서 연결 술어를 참조원별로 선언하게 바꿨다.
     *
     * <p>[LIKE 를 쓰지 않는 이유] {@code file_url LIKE '%'||?||'%'} 로 하면 요청자가 {@code %} 를
     * 첨부 ID 로 보내 <b>모든 팝업에 매칭</b>시켜 공유 근거를 만들 수 있다(와일드카드 주입).
     * 저장되는 두 형태를 <b>정확히 일치</b>로 비교한다.
     */
    POPUP("tb_popup_info", Sensitivity.SHARED, "1 = 1", "frst_rgtr_id = ?", null,
            "(file_url = '/api/v1/files/' || ? OR file_url = '/api/v1/files/download?fileId=' || ?)"),

    /** 게시판 글. 비밀글({@code scrt_yn='Y'})이 아니면 인증된 사용자에게 공개된 콘텐츠다. */
    BOARD("tb_bbs_item", Sensitivity.SHARED,
            "(scrt_yn IS NULL OR scrt_yn <> 'Y')",
            "frst_rgtr_id = ?", "user_id = ?"),

    /** FAQ. 공개 콘텐츠. */
    FAQ("tb_faq_info", Sensitivity.SHARED, "1 = 1", "frst_rgtr_id = ?", null),

    /** 배너 이미지. 공개 콘텐츠(비로그인 대시보드에도 노출되는 성격). */
    BANNER("tb_bnr_info", Sensitivity.SHARED, "1 = 1", "frst_rgtr_id = ?", null),

    /** 일정. 조직 공용 일정이라 인증 사용자에게 공유된다. */
    SCHEDULE("tb_schdl_info", Sensitivity.SHARED, "1 = 1", "frst_rgtr_id = ?", null),

    /** 부서 업무함. 부서 공용 자원(소유 모델 없음 — {@code SecurityUtil.assertAdmin} 계열과 동일 판정). */
    DEPT_TASK("tb_dept_task_info", Sensitivity.SHARED, "1 = 1", "frst_rgtr_id = ?", null),

    /**
     * 상담/토론. {@code rls_yn='Y'}(공개)일 때만 공유된다 —
     * 비공개 상담글은 {@code wrt_pswd} 로 보호되는 성격이라 첨부도 같은 등급으로 다룬다.
     */
    CONSULT("tb_dscsn_list", Sensitivity.SHARED, "(rls_yn = 'Y')", "frst_rgtr_id = ?", null),

    /** 업무일지. 개인 귀속. */
    DIARY("tb_diary_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /** 업무보고. 개인 귀속. */
    WORK_REPORT("tb_rpt_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /** 메모보고. 개인 귀속. */
    MEMO_REPORT("tb_memo_rpt_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /** 상벌 관리. 인사 민감 정보. */
    REWARD("tb_rward_manage", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /** 메일 발송 이력. 개인 귀속. */
    SENT_MAIL("tb_email_dsptch_manage", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /**
     * 쪽지(사인·私信). 발신자·수신자만 열람하며 <b>관리자도 우회하지 못한다</b>.
     * 수신자 축은 {@code tb_note_rcptn.rcvr_id}(esntlId), 발신자 축은 {@code tb_note_sndng.sndr_id}(esntlId).
     */
    NOTE("tb_note_info", Sensitivity.PERSONAL, null,
            "frst_rgtr_id = ?",
            "EXISTS (SELECT 1 FROM tb_note_sndng s WHERE s.note_id = tb_note_info.note_id AND s.sndr_id = ?)"
                    + " OR EXISTS (SELECT 1 FROM tb_note_rcptn r WHERE r.note_id = tb_note_info.note_id AND r.rcvr_id = ?)"),

    /**
     * 자료활용 통계. <b>접근권을 부여하지 않는다(DERIVED)</b> — 이 테이블은 "누가 무엇을 받아갔는가" 를
     * 기록하는 <em>파생 로그</em>라, 여기 행이 있다는 사실이 열람 권한의 근거가 될 수 없다.
     * (근거로 삼으면 한 번 다운로드된 첨부가 영구히 전체 공개된다.)
     */
    DATA_USE_STATS("tb_dta_use_stats", Sensitivity.DERIVED, null, null, null);

    /** 참조원의 민감도 — 관리자 우회 허용 여부를 가른다. */
    public enum Sensitivity {
        /** 인증 사용자에게 공유되는 콘텐츠. 관리자 우회 허용. */
        SHARED,
        /** 개인 귀속. <b>관리자도 우회하지 못한다</b>(§0.7-H3 프라이버시 가드). */
        PERSONAL,
        /** 파생 로그. 어떤 접근권도 부여하지 않는다. */
        DERIVED
    }

    /**
     * 대부분의 참조원이 쓰는 연결 술어 — 전용 {@code atch_file_id} 컬럼.
     * 예외는 {@link #POPUP} 하나이며, 그것이 이 술어를 참조원별로 선언하게 만든 이유다.
     */
    private static final String DEFAULT_LINKAGE = "atch_file_id = ?";

    private final String table;
    private final Sensitivity sensitivity;
    private final String sharedPredicate;
    private final String ownerByLoginIdPredicate;
    private final String ownerByEsntlIdPredicate;
    private final String linkagePredicate;

    AttachmentSource(String table, Sensitivity sensitivity, String sharedPredicate,
            String ownerByLoginIdPredicate, String ownerByEsntlIdPredicate) {
        this(table, sensitivity, sharedPredicate, ownerByLoginIdPredicate, ownerByEsntlIdPredicate,
                DEFAULT_LINKAGE);
    }

    AttachmentSource(String table, Sensitivity sensitivity, String sharedPredicate,
            String ownerByLoginIdPredicate, String ownerByEsntlIdPredicate, String linkagePredicate) {
        this.table = table;
        this.sensitivity = sensitivity;
        this.sharedPredicate = sharedPredicate;
        this.ownerByLoginIdPredicate = ownerByLoginIdPredicate;
        this.ownerByEsntlIdPredicate = ownerByEsntlIdPredicate;
        this.linkagePredicate = linkagePredicate;
    }

    /** 이 참조원이 첨부와 이어지는 방식(WHERE 절). {@code ?} 자리마다 atchFileId 가 바인딩된다. */
    public String linkagePredicate() {
        return linkagePredicate;
    }

    /** 전용 컬럼이 아니라 URL 문자열로 첨부를 참조하는가 — 레지스트리 린터의 판정 축이 갈린다. */
    public boolean linksByAttachmentIdColumn() {
        return DEFAULT_LINKAGE.equals(linkagePredicate);
    }

    public String table() {
        return table;
    }

    public Sensitivity sensitivity() {
        return sensitivity;
    }

    public String sharedPredicate() {
        return sharedPredicate;
    }

    public String ownerByLoginIdPredicate() {
        return ownerByLoginIdPredicate;
    }

    public String ownerByEsntlIdPredicate() {
        return ownerByEsntlIdPredicate;
    }

    /** 이 저장소가 첨부 참조원으로 인정하는 물리 테이블 전체. 린터의 대조 기준이다. */
    public static List<String> registeredTables() {
        return Arrays.stream(values()).map(source -> source.table).toList();
    }
}
