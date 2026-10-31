package nuri.business.service.file;

import java.util.Arrays;
import java.util.List;

/**
 * 🔒 첨부 도달성(reachability) 판정용 <b>참조원 레지스트리</b>.
 *
 * <p>[왜 필요한가] {@code tb_file_master} 는 소유 도메인을 모른다 — 첨부는 {@code atch_file_sn} 숫자 FK로
 * 업무 행(row)과 이어지지만 어느 참조가 열람 권한을 주는지는 FK가 설명하지 않는다. 그래서 "이 첨부를 이 사용자가 봐도 되는가" 는
 * 파일 자신이 답할 수 없고, <b>그 첨부를 참조하는 업무 행을 그 사용자가 읽을 수 있는가</b> 로만 답할 수 있다.
 * 이 enum 이 그 역참조 지도다.
 *
 * <p>[실측 근거 · 2026-08-04] {@code information_schema} 전수 조회로 {@code atch_file_sn} 컬럼을 가진
 * 테이블은 {@code tb_file_master}/{@code tb_file_detail} 을 제외하면 정확히 13종이며, 코드의
 * {@code atchFileSn} 보유 엔티티 13종과 1:1 로 대응한다. <b>여기에 {@link #POPUP} 하나가 더 붙어 14종이었다</b> —
 * 팝업만 전용 컬럼이 아니라 {@code file_url} 문자열로 첨부를 참조하기 때문에 컬럼 기준 census 에
 * 잡히지 않았다. 이 대응은 {@code AttachmentSourceRegistryLinterTest} 가 기계로 고정한다 —
 * 신규 도메인이 첨부를 갖는데 여기 등록되지 않으면 pre-push 가 red 다.
 *
 * <p><b>[2026-08-05 현행 12종]</b> 死도메인 정리로 두 참조원이 사라졌다 — 참조원이 줄어든 것이지
 * 판정이 느슨해진 것이 아니다.
 * <ul>
 *   <li>{@code FAQ}({@code tb_faq_info}) — FAQ 가 게시판으로 통합돼 전용 도메인이 死자산이었다(V2_40).</li>
 *   <li>{@code CONSULT}({@code tb_dscsn_list}) — 상담 도메인 전체가 미사용이었다(데이터 0행 · 메뉴 0 · FE 호출 0, V2_41).</li>
 * </ul>
 * 두 테이블 모두 첨부 참조가 0건이었으므로 도달성 판정이 바뀌는 첨부는 없다.
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
     * 레이어 팝업. <b>유일하게 {@code atch_file_sn} 가 아니라 URL 문자열로 첨부를 참조한다</b> —
     * {@code tb_popup_info.file_url} 에 {@code /api/v1/files/{id}} 형태를 저장한다.
     *
     * <p>[놓쳤던 이유 · 2026-08-04] 최초 census 를 {@code atch_file_sn} <b>컬럼 기준</b>으로 돌려
     * 이 도메인이 통째로 보이지 않았다. 그 결과 팝업 이미지가 업로더(관리자) 외에는 403 이 되어
     * 대시보드 팝업이 사용자에게 깨져 보였다 — E2E `05-public-experience` 가 잡았다.
     * 참조 형태를 컬럼 이름으로 가정한 것이 오류였고, 그래서 연결 술어를 참조원별로 선언하게 바꿨다.
     *
     * <p>[LIKE 를 쓰지 않는 이유] {@code file_url LIKE '%'||?||'%'} 로 하면 요청자가 {@code %} 를
     * 첨부 ID 로 보내 <b>모든 팝업에 매칭</b>시켜 공유 근거를 만들 수 있다(와일드카드 주입).
     * 저장되는 두 형태를 <b>정확히 일치</b>로 비교한다.
     *
     * <p>[SQL 에서 잇지 않는 이유] 비교할 URL 은 {@link #linkageParameters} 가 완성해 바인딩한다. MySQL·MariaDB 기본 설정의
     * {@code ||} 는 논리 OR 이라 {@code file_url = '...' || ?} 가 모든 팝업과 일치한다(ADR-0047).
     */
    POPUP("tb_popup_info", Sensitivity.SHARED, null, "frst_rgtr_id = ?", null,
            "(file_url = ? OR file_url = ?)"),

    /** 게시판 글. resolver는 비밀글 조건 앞에 커뮤니티 승인 회원 조건을, 공유 근거에 게시 기간(시작일·종료일) 조건을 함께 적용한다. */
    BOARD("tb_bbs_item", Sensitivity.SHARED,
            "(scrt_yn IS NULL OR scrt_yn <> 'Y') AND use_yn = 'Y'",
            "frst_rgtr_id = ?", "user_id = ?"),


    /** 배너 이미지. resolver가 반영 여부로 공유를 판정한다 — 반영 전 이미지는 등록자와 관리 조회 권한자만 연다. */
    BANNER("tb_bnr_info", Sensitivity.SHARED, null, "frst_rgtr_id = ?", null),

    /** 일정. resolver가 작성자·SCHEDULE_READ_ALL·같은 부서의 공유 일정 조건으로 열람을 판정한다. */
    SCHEDULE("tb_schdl_info", Sensitivity.SHARED, null, "frst_rgtr_id = ?", null),

    /**
     * 부서 업무. 부서 공용 자원이라 개인 귀속이 아니며 관리자 우회를 허용한다. resolver가 상세 열람과 같은 조건으로 공유를,
     * 수정·삭제와 같은 조건(담당자, 공석이면 등록자)으로 소유를 판정한다.
     */
    DEPT_TASK("tb_dept_task_info", Sensitivity.SHARED, null, "frst_rgtr_id = ?", null),

    /** 업무일지. 개인 귀속. */
    DIARY("tb_diary_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /** 업무보고. 개인 귀속. */
    WORK_REPORT("tb_rpt_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null),

    /**
     * 메모보고. 개인 귀속 — 작성자(소유자)와 보고를 받은 수신자만 연다.
     *
     * <p>[2026-10-19] 수신자({@code rptr_id}, esntlId 축 — {@code MemoReportService.createMemoReport} 가 활성 사용자의
     * esntlId 로 검증해 저장한다)는 메모 본문을 읽을 수 있는데 그 첨부는 403 이었다. 수신자를 <b>열람 전용 당사자</b>로 둔다 —
     * 메모를 고치거나 지울 수 없는 수신자에게 첨부 삭제 근거를 주지 않는다(H3). 관리자 우회 차단(PERSONAL)은 그대로다.
     * 연결 술어는 기본값과 같은 문자열이다(enum 상수 인자에서는 아래 상수를 아직 쓸 수 없다).
     */
    MEMO_REPORT("tb_memo_rpt_info", Sensitivity.PERSONAL, null, "frst_rgtr_id = ?", null,
            "atch_file_sn = ?", "rptr_id = ?"),

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
            "EXISTS (SELECT 1 FROM tb_note_sndng s WHERE s.note_sn = tb_note_info.note_sn AND s.sndr_id = ?)"
                    + " OR EXISTS (SELECT 1 FROM tb_note_rcptn r WHERE r.note_sn = tb_note_info.note_sn AND r.rcvr_id = ?)"),

    /**
     * 콘텐츠 페이지 이미지(ADR-0039 결정 8). 귀속 표 {@code tb_cms_conts_file} 이 첨부 하나를 페이지 하나에 묶는다. 판정은 리졸버의
     * 전용 조회가 한다 — 현재 게시본이 쓰는 첨부는 로그인 사용자에게 공유되고, 초안·지난 게시본의 첨부는 콘텐츠 관리 조회 권한자만
     * 연다. 귀속 행은 소유 근거를 만들지 않는다(업로더 본인 근거는 정책이 먼저 본다). 열람 거부(readDenied)도 만들지 않는다 — 같은
     * 업로더가 다른 공유 참조에 함께 쓴 첨부를 그 참조의 독자에게서 닫지 않는다. 일반 파일 API 의 삭제는 귀속 행의 FK 가 막는다.
     */
    CMS_PAGE("tb_cms_conts_file", Sensitivity.SHARED, null, null, null),

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
        /** 개인 귀속. <b>관리자도 우회하지 못한다</b>(AGENTS.md Evidence guardrails H3 프라이버시 가드). */
        PERSONAL,
        /** 파생 로그. 어떤 접근권도 부여하지 않는다. */
        DERIVED
    }

    /**
     * 대부분의 참조원이 쓰는 연결 술어 — 전용 {@code atch_file_sn} 컬럼.
     * 예외는 {@link #POPUP} 하나이며, 그것이 이 술어를 참조원별로 선언하게 만든 이유다.
     */
    private static final String DEFAULT_LINKAGE = "atch_file_sn = ?";

    private final String table;
    private final Sensitivity sensitivity;
    private final String sharedPredicate;
    private final String ownerByLoginIdPredicate;
    private final String ownerByEsntlIdPredicate;
    private final String linkagePredicate;
    private final String readerByEsntlIdPredicate;

    AttachmentSource(String table, Sensitivity sensitivity, String sharedPredicate,
            String ownerByLoginIdPredicate, String ownerByEsntlIdPredicate) {
        this(table, sensitivity, sharedPredicate, ownerByLoginIdPredicate, ownerByEsntlIdPredicate,
                DEFAULT_LINKAGE, null);
    }

    AttachmentSource(String table, Sensitivity sensitivity, String sharedPredicate,
            String ownerByLoginIdPredicate, String ownerByEsntlIdPredicate, String linkagePredicate) {
        this(table, sensitivity, sharedPredicate, ownerByLoginIdPredicate, ownerByEsntlIdPredicate,
                linkagePredicate, null);
    }

    AttachmentSource(String table, Sensitivity sensitivity, String sharedPredicate,
            String ownerByLoginIdPredicate, String ownerByEsntlIdPredicate, String linkagePredicate,
            String readerByEsntlIdPredicate) {
        if (readerByEsntlIdPredicate != null && sensitivity != Sensitivity.PERSONAL) {
            // 공유 참조원은 sharedPredicate 가 열람을 맡는다. 열람 전용 당사자는 개인 귀속에서만 뜻이 있다.
            throw new IllegalArgumentException("열람 전용 당사자 술어는 PERSONAL 참조원에만 둔다: " + table);
        }
        this.table = table;
        this.sensitivity = sensitivity;
        this.sharedPredicate = sharedPredicate;
        this.ownerByLoginIdPredicate = ownerByLoginIdPredicate;
        this.ownerByEsntlIdPredicate = ownerByEsntlIdPredicate;
        this.linkagePredicate = linkagePredicate;
        this.readerByEsntlIdPredicate = readerByEsntlIdPredicate;
    }

    /** 이 참조원이 첨부와 이어지는 방식(WHERE 절). {@code ?} 자리마다 atchFileSn 가 바인딩된다. */
    public String linkagePredicate() {
        return linkagePredicate;
    }

    /** {@link #linkagePredicate()} 의 자리표시자에 순서대로 바인딩할 값. */
    public List<Object> linkageParameters(Long atchFileSn) {
        if (this == POPUP) {
            return List.of("/api/v1/files/" + atchFileSn, "/api/v1/files/download?fileId=" + atchFileSn);
        }
        return List.of(atchFileSn);
    }

    /** 전용 컬럼이 아니라 URL 문자열로 첨부를 참조하는가 — 레지스트리 린터의 판정 축이 갈린다. */
    public boolean linksByAttachmentSnColumn() {
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

    /**
     * 개인 귀속 참조 행을 <b>열람만</b> 할 수 있는 당사자(esntlId 축) — 메모보고 수신자 등. 없으면 {@code null}.
     * 소유 술어와 달리 삭제 근거가 아니다({@code FileAccessPolicy#assertDeletable} 는 보지 않는다).
     */
    public String readerByEsntlIdPredicate() {
        return readerByEsntlIdPredicate;
    }

    /** 이 저장소가 첨부 참조원으로 인정하는 물리 테이블 전체. 린터의 대조 기준이다. */
    public static List<String> registeredTables() {
        return Arrays.stream(values()).map(source -> source.table).toList();
    }
}
