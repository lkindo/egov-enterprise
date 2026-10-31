package nuri.business.service.file;

import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * {@link AttachmentReferenceResolver} 의 JDBC 구현. 기능별 {@link AttachmentSourceContributor}가
 * 제공한 참조 규칙만 순회하며 참조 행의 존재와 열람 근거를 집계한다.
 *
 * <p>[네이티브 SQL 인 이유] 참조원은 business-core/business-app의 여러 기능에 흩어져 있다.
 * JPA 로 묶으려면 core 가 app 엔티티를 알아야 해 모듈 방향성이 역전된다. 인가 판정 한 곳을 위해
 * 의존 방향을 뒤집는 대신 물리 테이블을 직접 조회한다. 규칙 소유권은 각 기능 contributor에 두고,
 * 그 매핑은 {@code AttachmentSourceRegistryLinterTest} 로 검증한다. 따라서 base projection에서 기능이
 * 빠지면 해당 참조원도 함께 빠져 존재하지 않는 테이블을 조회하지 않는다.
 *
 * <p><b>[fail-closed]</b> 조회 실패(테이블 부재·권한 등)는 별도 실패 상태로 집계한다.
 * 이미 다른 참조원에서 소유·공유 근거를 확인했더라도 실패 상태가 그 근거보다 우선한다 —
 * 인가 판정에서 모르는 것은 허용이 아니다.
 */
@Slf4j
@Component
public class JdbcAttachmentReferenceResolver implements AttachmentReferenceResolver {

    private final JdbcTemplate jdbcTemplate;
    private final List<AttachmentSource> sources;
    private final CommunityBoardAccessPort communityAccess;

    /** 게시 기간 판정의 시간대 — 본문 판정(BoardPolicySupport)과 같은 Asia/Seoul 이다. */
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    /**
     * 게시 기간 판정의 시계(ADR-0040 결정 3). 생성자 인자가 아니다 — Clock 빈이 없다. 본문·첨부 대조 시험이 같은 고정 시계를
     * 두 판정에 건다.
     */
    private Clock clock = Clock.system(SERVICE_ZONE);

    /** 날짜 경계 대조 시험에서 본문 판정과 같은 고정 시계를 건다. */
    void useClock(Clock clock) {
        this.clock = java.util.Objects.requireNonNull(clock, "clock");
    }

    public JdbcAttachmentReferenceResolver(
            JdbcTemplate jdbcTemplate,
            List<AttachmentSourceContributor> contributors) {
        this(jdbcTemplate, contributors, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public JdbcAttachmentReferenceResolver(JdbcTemplate jdbcTemplate,
            List<AttachmentSourceContributor> contributors,
            @Nullable CommunityBoardAccessPort communityAccess) {
        this.jdbcTemplate = jdbcTemplate;
        this.communityAccess = communityAccess;
        this.sources = contributors.stream()
                .flatMap(contributor -> contributor.sources().stream())
                .sorted(Comparator.comparing(AttachmentSource::table))
                .toList();
        if (sources.isEmpty()) {
            throw new IllegalStateException("첨부 참조원 contributor가 하나도 등록되지 않았다.");
        }
        Set<String> distinctTables = sources.stream()
                .map(AttachmentSource::table)
                .collect(Collectors.toSet());
        if (distinctTables.size() != sources.size()) {
            throw new IllegalStateException("첨부 참조원 table이 중복 등록됐다.");
        }
    }

    @Override
    public Grants resolve(Long atchFileSn, String loginId, String esntlId) {
        boolean shared = false;
        boolean owner = false;
        boolean personal = false;
        boolean personalOwner = false;
        boolean personalReader = false;
        boolean resolutionFailed = false;
        boolean readDenied = false;

        for (AttachmentSource source : sources) {
            if (source.sensitivity() == AttachmentSource.Sensitivity.DERIVED) {
                // 파생 로그는 어떤 근거도 만들지 않는다 — 조회 자체를 생략한다.
                continue;
            }
            try {
                SourceHit hit = query(source, atchFileSn, loginId, esntlId);
                // 일정 본문을 읽지 못하면 다른 공유 참조나 FILE_READ_ALL로 첨부만 열 수 없다.
                // 삭제에는 이 제한을 적용하지 않으므로 owner와 별도로 집계한다.
                readDenied |= source == AttachmentSource.SCHEDULE && hit.referenced()
                        && !hit.shared() && !hit.owner();
                shared |= hit.shared();
                owner |= hit.owner();
                boolean personalSource = source.sensitivity() == AttachmentSource.Sensitivity.PERSONAL;
                personal |= hit.referenced() && personalSource;
                personalOwner |= hit.owner() && personalSource;
                personalReader |= hit.reader() && personalSource;
            } catch (DataAccessException ex) {
                log.error("[FileAccess] 참조원 조회 실패 — fail-closed 로 처리한다. source={} table={} atchFileSn={}",
                        source, source.table(), atchFileSn, ex);
                resolutionFailed = true;
            }
        }
        return new Grants(shared, owner, personal, personalOwner, resolutionFailed, personalReader, readDenied);
    }

    @Override
    public boolean referenced(Long atchFileSn) {
        for (AttachmentSource source : sources) {
            if (source.sensitivity() == AttachmentSource.Sensitivity.DERIVED) {
                continue;
            }
            try {
                if (query(source, atchFileSn, null, null).referenced()) {
                    return true;
                }
            } catch (DataAccessException ex) {
                log.error("[FileAccess] 참조원 조회 실패 — 참조가 있는 것으로 본다. source={} table={} atchFileSn={}",
                        source, source.table(), atchFileSn, ex);
                return true;
            }
        }
        return false;
    }

    private SourceHit query(AttachmentSource source, Long atchFileSn, String loginId, String esntlId) {
        if (source == AttachmentSource.BOARD) return queryBoard(atchFileSn, loginId, esntlId);
        if (source == AttachmentSource.SCHEDULE) return querySchedule(atchFileSn, loginId);
        if (source == AttachmentSource.CMS_PAGE) return queryCmsPage(atchFileSn);
        List<Object> params = new ArrayList<>();

        String sharedExpr = source.sharedPredicate() != null ? source.sharedPredicate() : "1 = 0";

        StringBuilder ownerExpr = new StringBuilder();
        if (source.ownerByLoginIdPredicate() != null && loginId != null) {
            ownerExpr.append('(').append(source.ownerByLoginIdPredicate()).append(')');
            for (int i = 0; i < countPlaceholders(source.ownerByLoginIdPredicate()); i++) {
                params.add(loginId);
            }
        }
        if (source.ownerByEsntlIdPredicate() != null && esntlId != null) {
            if (ownerExpr.length() > 0) {
                ownerExpr.append(" OR ");
            }
            ownerExpr.append('(').append(source.ownerByEsntlIdPredicate()).append(')');
            // NOTE 의 esntlId 술어는 발신/수신 두 EXISTS 로 이뤄져 파라미터를 2개 요구한다.
            for (int i = 0; i < countPlaceholders(source.ownerByEsntlIdPredicate()); i++) {
                params.add(esntlId);
            }
        }
        if (ownerExpr.length() == 0) {
            ownerExpr.append("1 = 0");
        }

        // 열람 전용 당사자(메모보고 수신자 등). SELECT 절 순서대로 소유 술어 뒤에 바인딩한다.
        String readerExpr = "1 = 0";
        if (source.readerByEsntlIdPredicate() != null && esntlId != null) {
            readerExpr = "(" + source.readerByEsntlIdPredicate() + ")";
            for (int i = 0; i < countPlaceholders(source.readerByEsntlIdPredicate()); i++) {
                params.add(esntlId);
            }
        }

        // SELECT 절의 ? 가 WHERE 절보다 앞서므로 연결 값은 마지막에 바인딩한다.
        // 연결 술어는 참조원마다 다르다(POPUP 은 URL 비교라 값이 2개이고 저장 형태로 완성해 넘긴다).
        params.addAll(source.linkageParameters(atchFileSn));

        String sql = "SELECT COUNT(*) AS ref_cnt,"
                + " SUM(CASE WHEN " + sharedExpr + " THEN 1 ELSE 0 END) AS shared_cnt,"
                + " SUM(CASE WHEN " + ownerExpr + " THEN 1 ELSE 0 END) AS owner_cnt,"
                + " SUM(CASE WHEN " + readerExpr + " THEN 1 ELSE 0 END) AS reader_cnt"
                + " FROM " + source.table()
                + " WHERE " + source.linkagePredicate();

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new SourceHit(
                rs.getLong("ref_cnt") > 0,
                rs.getLong("shared_cnt") > 0,
                rs.getLong("owner_cnt") > 0,
                rs.getLong("reader_cnt") > 0), params.toArray());
    }

    /**
     * The referenced board's community gate applies before either owner or public-post reachability.
     *
     * <p>[2026-09-25 DIP S7, GAP-DOMAIN-001 ②] 공유 근거는 <b>게시글과 게시판이 모두 사용 중일 때만</b> 생긴다.
     * 게시글·게시판 삭제는 {@code use_yn='N'} 논리 삭제라 참조 행이 남는다 — 종전에는 이 행이 계속 공유 근거가
     * 되어, 화면에서 사라진 공개 글의 첨부를 번호만 알면 인증 사용자 누구나 내려받을 수 있었다. 소유 근거는
     * 그대로 둔다(작성자는 자기 첨부를 계속 받는다). 판정할 수 없는 값({@code NULL})은 사용 중으로 보지 않는다.
     *
     * <p>[2026-10-23 ADR-0040] 게시 종료일이 지난 글은 조회 대행 권한({@code BOARD_READ_ALL}) 보유자에게만 공유 근거가
     * 된다. 본문은 종료 글을 작성자·조회 대행 권한자에게만 여는데(DEC-OPS-206 ①), 첨부는 이 조건이 없어 번호만 알면 받을 수
     * 있었다. 조회 대행 권한은 종료일만 면제한다 — 비밀글·논리 삭제 글의 관리자 경로는 지금처럼 {@code FILE_READ_ALL} 하나다.
     * 기준일은 본문({@code BoardPolicySupport})과 같은 Asia/Seoul 오늘이며, 두 판정의 일치는 {@code BoardAttachmentAccessTest} 가
     * 대조한다.
     *
     * <p>[2026-10-23 ADR-0040 결정 1] 조회 대행 권한은 게시판의 사용 안 함도 면제한다 — 본문이 사용 안 함 게시판의 글을
     * 운영자에게 여는 것과 같다. 글의 논리 삭제는 면제하지 않는다(그 관리자 경로는 {@code FILE_READ_ALL} 이다).
     * 사용 안 함 게시판에서는 작성자의 소유 근거도 닫는다 — 이용자에게 읽기·쓰기를 모두 닫고 작성자 본인의 정리도 허용하지
     * 않는다(D1 기각 ②). 소유 근거는 첨부 열람과 삭제(FileAccessPolicy) 양쪽의 근거다.
     *
     * <p>[2026-10-23 ADR-0040 결정 3] 게시 시작일 전인 예약 글도 조회 대행 권한 보유자에게만 공유 근거가 된다 — 본문이 예약 글을
     * 작성자·조회 대행 권한자에게만 여는 것과 같다. 종료일 조건과 따로 둔 절이다. 소유 근거는 그대로라 작성자는 자기 예약 글의
     * 첨부를 받는다(본문과 같다). 기준일은 이 요청에서 한 번 계산한다.
     */
    private SourceHit queryBoard(Long fileId, String loginId, String esntlId) {
        String today = LocalDate.ofInstant(clock.instant(), SERVICE_ZONE).format(DateTimeFormatter.BASIC_ISO_DATE);
        boolean readAll = nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL");
        var references = jdbcTemplate.query("""
                SELECT b.frst_rgtr_id,b.user_id,b.scrt_yn,b.use_yn AS post_use_yn,b.pst_bgng_ymd,b.pst_end_ymd,
                       m.bbs_id AS master_id,m.cmnty_sn,m.use_yn AS master_use_yn
                  FROM tb_bbs_item b LEFT JOIN tb_bbs_master m ON m.bbs_id=b.bbs_id
                 WHERE b.atch_file_sn=?
                """, (rs,n) -> new BoardReference(rs.getString("frst_rgtr_id"),rs.getString("user_id"),
                    rs.getString("scrt_yn"),rs.getString("master_id"),rs.getObject("cmnty_sn",Long.class),
                    "Y".equals(rs.getString("post_use_yn")), "Y".equals(rs.getString("master_use_yn")),
                    postingOpen(rs.getString("pst_end_ymd"), today),
                    postingStarted(rs.getString("pst_bgng_ymd"), today)),fileId);
        boolean shared=false, owner=false;
        for (var reference: references) {
            if (reference.masterId()==null) throw new org.springframework.dao.DataRetrievalFailureException("Referenced board master missing");
            boolean communityAllowed=reference.communityId()==null
                    || readAll
                    || (communityAccess!=null && esntlId!=null && communityAccess.isApprovedMember(reference.communityId(),esntlId));
            if (communityAllowed) {
                shared |= reference.postActive() && (reference.boardInUse() || readAll)
                        && (reference.postingOpen() || readAll)
                        && (reference.postingStarted() || readAll)
                        && !"Y".equals(reference.secret());
                owner |= (reference.boardInUse() || readAll)
                        && ((loginId!=null && loginId.equals(reference.registrar())) || (esntlId!=null && esntlId.equals(reference.userId())));
            }
        }
        return new SourceHit(!references.isEmpty(),shared,owner,false);
    }

    /** 게시 종료일(yyyyMMdd)이 비었거나 기준일 이후인가. 사전순 비교가 날짜 비교와 같다(BoardPredicate 와 같은 규칙). */
    private static boolean postingOpen(String pstEndYmd, String today) {
        return pstEndYmd == null || pstEndYmd.isEmpty() || pstEndYmd.compareTo(today) >= 0;
    }

    /** 게시 시작일(yyyyMMdd)이 비었거나 기준일 이전·당일인가(시작일 전이면 예약 글). BoardPredicate 와 같은 사전순 규칙이다. */
    private static boolean postingStarted(String pstBgngYmd, String today) {
        return pstBgngYmd == null || pstBgngYmd.isEmpty() || pstBgngYmd.compareTo(today) <= 0;
    }

    private record BoardReference(String registrar,String userId,String secret,String masterId,Long communityId,
            boolean postActive, boolean boardInUse, boolean postingOpen, boolean postingStarted) {}

    /**
     * ScheduleService#getSchedule와 같은 열람 조건. core가 선택 기능의 엔티티에 의존하지 않도록
     * 등록된 참조원만 SQL로 읽고, 본문/첨부의 일치는 ScheduleAttachmentAccessTest로 대조한다.
     * 같은 부서와 전체 열람 권한은 공유 근거이며 소유(삭제) 근거로 승격하지 않는다.
     */
    private SourceHit querySchedule(Long fileId, String loginId) {
        var references = jdbcTemplate.query("""
                SELECT s.frst_rgtr_id, s.schdl_se_cd, s.schdl_dept_id, u.ognz_id
                  FROM tb_schdl_info s LEFT JOIN tb_user_info u ON u.user_id = ?
                 WHERE s.atch_file_sn = ?
                """, (rs, rowNum) -> new ScheduleReference(rs.getString("frst_rgtr_id"),
                    rs.getString("schdl_se_cd"), rs.getString("schdl_dept_id"), rs.getString("ognz_id")),
                loginId, fileId);
        boolean readAll = nuri.business.security.util.SecurityUtil.hasPermission("SCHEDULE_READ_ALL");
        boolean shared = false, owner = false;
        for (var reference : references) {
            // 기존 본문 정책은 사용자 없음·소속 미배정(null/blank)을 기본조직으로 취급한다.
            String department = reference.userDepartment();
            if (department == null || department.isBlank()) department = "ORGNZT_0000000000000";
            shared |= readAll || (loginId != null && !loginId.isBlank()
                    && "1".equals(reference.sharing()) && department.equals(reference.department()));
            owner |= loginId != null && loginId.equals(reference.registrar());
        }
        return new SourceHit(!references.isEmpty(), shared, owner, false);
    }

    /**
     * 콘텐츠 페이지 이미지(ADR-0039). 페이지의 현재 게시본이 이 첨부를 쓰면 로그인 사용자에게 공유하고, 그 밖에는 콘텐츠 관리 조회
     * 권한자에게만 공유한다(다른 편집자의 초안 미리보기). 소유·열람 거부 근거는 만들지 않는다.
     *
     * <p>열람 판정은 묶음 단위인데 페이지가 쓰는 것은 그 묶음의 파일 한 건이다. 업로더가 일반 파일 API 로 같은 묶음에 파일을
     * 덧붙이면 그 묶음은 로그인 사용자 공유를 잃는다 — 이미지 검사를 거치지 않은 파일을 모두에게 열지 않는다(fail-closed).
     */
    private SourceHit queryCmsPage(Long fileId) {
        List<Boolean> published = jdbcTemplate.query("""
                SELECT CASE WHEN EXISTS (SELECT 1 FROM tb_cms_conts c
                                 JOIN tb_cms_conts_rvsn_file rf
                                   ON rf.conts_rvsn_sn = c.conts_rvsn_sn AND rf.conts_file_sn = f.conts_file_sn
                                WHERE c.conts_sn = f.conts_sn AND c.kpng_yn = 'N')
                       AND NOT EXISTS (SELECT 1 FROM tb_file_detail d
                                        WHERE d.atch_file_sn = f.atch_file_sn AND d.atch_file_seq <> f.atch_file_seq)
                       THEN 1 ELSE 0 END AS published
                  FROM tb_cms_conts_file f
                 WHERE f.atch_file_sn = ?
                """, (rs, rowNum) -> rs.getBoolean("published"), fileId);
        if (published.isEmpty()) {
            return new SourceHit(false, false, false, false);
        }
        boolean shared = Boolean.TRUE.equals(published.get(0))
                || nuri.business.security.util.SecurityUtil.hasPermission("CMS_ADMIN_READ");
        return new SourceHit(true, shared, false, false);
    }

    private record ScheduleReference(String registrar, String sharing, String department, String userDepartment) {}

    /**
     * 술어에 들어 있는 <b>바인드 자리표시자</b> 개수를 센다.
     *
     * <p><b>작은따옴표 문자열 리터럴 안의 {@code ?} 는 세지 않는다.</b> 이 구분이 없으면
     * {@code file_url = '/api/v1/files/download?fileId=1'} 같은 술어에서 URL 안의 {@code ?} 까지 세어
     * 파라미터를 하나 더 바인딩하고, JDBC 는 자리표시자 개수 불일치로 실패한다
     * (2026-08-04 실측 — 팝업 참조원을 추가하며 드러났다. JDBC 드라이버는 리터럴 안의 {@code ?} 를
     * 자리표시자로 보지 않으므로 이 함수도 같은 규칙을 따라야 한다).
     *
     * <p>SQL 표준의 이스케이프({@code ''})는 따옴표 상태를 두 번 토글해 자연히 처리된다.
     */
    private static int countPlaceholders(String predicate) {
        int count = 0;
        boolean inLiteral = false;
        for (int i = 0; i < predicate.length(); i++) {
            char c = predicate.charAt(i);
            if (c == '\'') {
                inLiteral = !inLiteral;
            } else if (c == '?' && !inLiteral) {
                count++;
            }
        }
        return count;
    }

    private record SourceHit(boolean referenced, boolean shared, boolean owner, boolean reader) {
    }
}
