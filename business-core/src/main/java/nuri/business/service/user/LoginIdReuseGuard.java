package nuri.business.service.user;

import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.user.LoginIdReferenceContributor;
import nuri.foundation.core.persistence.VendorSqlDialect;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * 새 계정의 로그인 ID 가 지워진 계정의 옛 기록을 물려받는지 판정한다.
 *
 * <p>[무엇을 막는가] 사용자는 물리 삭제되고, 여러 기능이 기록의 주인을 로그인 ID 로 판정한다
 * ({@link LoginIdReferenceContributor}). 그래서 같은 로그인 ID 로 다시 만든 계정은 옛 업무 보고·일정·메모 보고를 고치고
 * 지우며, 담당자가 빈 부서 업무와 업로더 본인의 첨부를 제 것으로 연다. 사용자 등록은 이 판정이 참이면 일반 중복과 같은
 * 오류로 거부한다 — 응답으로 어느 기록이 남았는지 드러내지 않는다(로그에는 표·컬럼 이름만 남긴다, 값은 남기지 않는다).
 *
 * <p>[네이티브 SQL 인 이유] 기록 표는 선택 기능(business-app)에 있어 core 가 그 엔티티를 알 수 없다. 첨부 참조원
 * 판정({@code JdbcAttachmentReferenceResolver})과 같이 기능이 등록한 표·컬럼만 물리 조회한다. 이름은 등록할 때
 * 식별자 형식을 확인하고(값이 아니라 코드 상수다), 로그인 ID 는 바인드 변수로만 넘긴다.
 *
 * <p>[fail-closed] 조회가 실패하면(표 부재·권한 등) 예외를 그대로 올려 등록을 막는다 — 확인하지 못한 것을 '남은 기록
 * 없음' 으로 보지 않는다. 사용자 등록은 드물어 등록한 컬럼마다 EXISTS 를 한 번씩 부르는 비용을 감수한다.
 */
@Slf4j
@Component
public class LoginIdReuseGuard {

    private final JdbcTemplate jdbcTemplate;
    private final VendorSqlDialect vendorSql;
    private final List<LoginIdReferenceContributor.Reference> references;

    public LoginIdReuseGuard(JdbcTemplate jdbcTemplate, List<LoginIdReferenceContributor> contributors,
            VendorSqlDialect vendorSql) {
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
        this.vendorSql = Objects.requireNonNull(vendorSql, "vendorSql");
        List<LoginIdReferenceContributor.Reference> collected = Objects.requireNonNull(contributors, "contributors").stream()
                .flatMap(contributor -> {
                    var declared = contributor.loginIdReferences();
                    if (declared == null || declared.isEmpty()) {
                        throw new IllegalStateException("로그인 ID 참조 contributor 가 컬럼을 하나도 등록하지 않았다: "
                                + contributor.getClass().getName());
                    }
                    return declared.stream();
                })
                .sorted(Comparator.comparing(LoginIdReferenceContributor.Reference::qualifiedName))
                .toList();
        if (collected.isEmpty()) {
            throw new IllegalStateException("로그인 ID 참조 contributor 가 하나도 등록되지 않았다.");
        }
        if (collected.stream().map(LoginIdReferenceContributor.Reference::qualifiedName).distinct().count()
                != collected.size()) {
            throw new IllegalStateException("로그인 ID 참조 컬럼이 중복 등록됐다: " + collected);
        }
        this.references = collected;
    }

    /** 등록된 컬럼(표 이름 순). 판정 대상의 정본이며 시험이 물리 스키마와 대조한다. */
    public List<LoginIdReferenceContributor.Reference> references() {
        return references;
    }

    /**
     * 이 로그인 ID 를 소유·작성자로 담은 기록이 하나라도 남았는가.
     *
     * @param loginId 새 계정에 쓰려는 로그인 ID
     * @return 남은 기록이 있으면 {@code true}
     */
    public boolean isStillReferenced(String loginId) {
        if (loginId == null || loginId.isEmpty()) {
            return false;
        }
        for (LoginIdReferenceContributor.Reference reference : references) {
            Boolean found = jdbcTemplate.queryForObject(
                    vendorSql.existsQuery("SELECT 1 FROM " + reference.table() + " WHERE " + reference.column() + " = ?"),
                    Boolean.class, loginId);
            if (Boolean.TRUE.equals(found)) {
                log.info("[LoginIdReuse] 지워진 계정의 기록이 남은 로그인 ID 로 등록을 거부했다 — 기록 위치 {}",
                        reference.qualifiedName());
                return true;
            }
        }
        return false;
    }
}
