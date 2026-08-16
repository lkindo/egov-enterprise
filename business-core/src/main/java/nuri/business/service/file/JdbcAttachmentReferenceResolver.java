package nuri.business.service.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

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
 * <p><b>[fail-closed]</b> 조회 실패(테이블 부재·권한 등)는 <b>열람 근거 없음 + 개인 참조 존재</b>로
 * 취급한다. 즉 실패는 관리자 우회까지 막는 쪽으로 기운다 — 인가 판정에서 모르는 것은 허용이 아니다.
 */
@Slf4j
@Component
public class JdbcAttachmentReferenceResolver implements AttachmentReferenceResolver {

    private final JdbcTemplate jdbcTemplate;
    private final List<AttachmentSource> sources;

    public JdbcAttachmentReferenceResolver(
            JdbcTemplate jdbcTemplate,
            List<AttachmentSourceContributor> contributors) {
        this.jdbcTemplate = jdbcTemplate;
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

        for (AttachmentSource source : sources) {
            if (source.sensitivity() == AttachmentSource.Sensitivity.DERIVED) {
                // 파생 로그는 어떤 근거도 만들지 않는다 — 조회 자체를 생략한다.
                continue;
            }
            try {
                SourceHit hit = query(source, atchFileSn, loginId, esntlId);
                shared |= hit.shared();
                owner |= hit.owner();
                personal |= hit.referenced() && source.sensitivity() == AttachmentSource.Sensitivity.PERSONAL;
            } catch (DataAccessException ex) {
                log.error("[FileAccess] 참조원 조회 실패 — fail-closed 로 처리한다. source={} table={} atchFileSn={}",
                        source, source.table(), atchFileSn, ex);
                personal = true;
            }
        }
        return new Grants(shared, owner, personal);
    }

    private SourceHit query(AttachmentSource source, Long atchFileSn, String loginId, String esntlId) {
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

        // SELECT 절의 ? 가 WHERE 절보다 앞서므로 atchFileSn 는 마지막에 바인딩한다.
        // 연결 술어는 참조원마다 다르고(POPUP 은 URL 비교라 자리표시자가 2개다) 개수만큼 반복 바인딩한다.
        for (int i = 0; i < countPlaceholders(source.linkagePredicate()); i++) {
            params.add(atchFileSn);
        }

        String sql = "SELECT COUNT(*) AS ref_cnt,"
                + " SUM(CASE WHEN " + sharedExpr + " THEN 1 ELSE 0 END) AS shared_cnt,"
                + " SUM(CASE WHEN " + ownerExpr + " THEN 1 ELSE 0 END) AS owner_cnt"
                + " FROM " + source.table()
                + " WHERE " + source.linkagePredicate();

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new SourceHit(
                rs.getLong("ref_cnt") > 0,
                rs.getLong("shared_cnt") > 0,
                rs.getLong("owner_cnt") > 0), params.toArray());
    }

    /**
     * 술어에 들어 있는 <b>바인드 자리표시자</b> 개수를 센다.
     *
     * <p><b>작은따옴표 문자열 리터럴 안의 {@code ?} 는 세지 않는다.</b> 이 구분이 없으면
     * {@code '/api/v1/files/download?fileId=' || ?} 같은 술어에서 URL 안의 {@code ?} 까지 세어
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

    private record SourceHit(boolean referenced, boolean shared, boolean owner) {
    }
}
