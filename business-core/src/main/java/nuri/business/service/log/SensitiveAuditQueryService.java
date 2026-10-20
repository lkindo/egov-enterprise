package nuri.business.service.log;

import com.querydsl.core.BooleanBuilder;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.log.LogSearchPeriod;
import nuri.business.domain.log.QSensitiveAuditLog;
import nuri.business.domain.log.SensitiveAuditLog;
import nuri.business.domain.log.SensitiveAuditLogRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.log.dto.AuditJournalEntry;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.IntConsumer;
import com.querydsl.core.types.Predicate;

/**
 * 민감 작업 감사 원장({@code tb_sys_adt_log})을 읽는다(2026-10-01 결정 19).
 *
 * <p>종전에는 원장이 쌓이기만 하고 읽을 경로가 없어, 누가 언제 비밀번호를 초기화하거나 개인정보를 내려받았는지
 * DB 를 직접 열어야 알 수 있었다. 읽기는 별도 권한 {@code ADT_LOG_READ} 로만 열고 기본 그룹에 배정하지 않는다 —
 * 원장을 보는 사람이 원장에 기록되는 작업을 하는 사람과 같으면 감사의 의미가 약해진다. 원장은 추가만 하는
 * 기록이므로 이 서비스에는 쓰기가 없다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SensitiveAuditQueryService {
    private static final int MAX_PAGE_SIZE = 100;

    private final SensitiveAuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public Page<AuditJournalEntry> search(String actorId, String operation, String fromDate, String toDate, int page, int size) {
        SecurityUtil.assertPermission("ADT_LOG_READ");
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        return repository.findAll(condition(actorId, operation, fromDate, toDate),
                PageRequest.of(page, size, NEWEST_FIRST)).map(this::toEntry);
    }

    /**
     * [2026-10-20] 목록과 같은 조건의 전체 행(내보내기). 조건 해석·검증은 목록과 한 곳이다 — 둘이 갈라지면 화면에서 좁힌 조건과
     * 다른 파일을 받는다. 행 수를 먼저 세어 {@code withinCap} 이 상한을 판정한 뒤에만 전량을 읽는다(상한 초과 요청이 힙에 전량을
     * 올리지 않게 한다 — 로그 내보내기와 같은 규칙). 권한은 목록과 같은 {@code ADT_LOG_READ} 다(내보내기용 권한을 새로 두지 않는다).
     */
    public List<AuditJournalEntry> exportEntries(String actorId, String operation, String fromDate, String toDate,
                                                 IntConsumer withinCap) {
        SecurityUtil.assertPermission("ADT_LOG_READ");
        Predicate where = condition(actorId, operation, fromDate, toDate);
        long total = repository.count(where);
        Objects.requireNonNull(withinCap, "withinCap").accept((int) Math.min(total, Integer.MAX_VALUE));
        List<AuditJournalEntry> rows = new ArrayList<>();
        repository.findAll(where, NEWEST_FIRST).forEach(row -> rows.add(toEntry(row)));
        return rows;
    }

    /**
     * [2026-10-20] 원장에 남은 작업 종류(작업 이름) — 조건 검색의 '작업 종류' 선택지다. 원장에 실제로 있는 값만 돌려주므로 고르면
     * 언제나 그 행이 있다. 작업 이름은 코드가 정한 값(핸들러 이름·작업 코드)이라 개인정보가 없다.
     */
    public List<String> operations() {
        SecurityUtil.assertPermission("ADT_LOG_READ");
        return repository.findDistinctOperations();
    }

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "logSn");

    /** 목록·내보내기 공통 조건. 행위자는 로그인 ID, 작업은 작업 이름과 정확히 같은 값으로, 기간은 시작·종료를 함께 주어야 거른다. */
    private static Predicate condition(String actorId, String operation, String fromDate, String toDate) {
        if ((actorId != null && actorId.length() > 20) || (operation != null && operation.length() > 100)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        QSensitiveAuditLog log = QSensitiveAuditLog.sensitiveAuditLog;
        BooleanBuilder where = new BooleanBuilder();
        if (actorId != null && StringUtils.hasText(actorId)) where.and(log.frstRgtrId.eq(actorId.trim()));
        if (operation != null && StringUtils.hasText(operation)) where.and(log.jobNm.eq(operation.trim()));
        boolean hasFrom = StringUtils.hasText(fromDate);
        boolean hasTo = StringUtils.hasText(toDate);
        if (hasFrom != hasTo) {
            // 한쪽만 주면 기간이 성립하지 않는다 — 조용히 무시하면 좁혔다고 믿고 전체를 본다.
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 기간은 시작일과 종료일을 함께 입력하세요.");
        }
        if (hasFrom) {
            LogSearchPeriod.requireOrdered(fromDate, toDate);
            LocalDateTime start = LogSearchPeriod.toLocalDate(fromDate, "fromDate").atStartOfDay();
            LocalDateTime end = LogSearchPeriod.toLocalDate(toDate, "toDate").atTime(LocalTime.MAX);
            where.and(log.adtDt.between(start, end));
        }
        return where;
    }

    private AuditJournalEntry toEntry(SensitiveAuditLog row) {
        JsonNode snapshot = parse(row.getAdtCn());
        return new AuditJournalEntry(row.getLogSn().toString(), row.getDmndIdntfr(), row.getPrcsSttsNm(), row.getJobNm(),
                row.getFrstRgtrId(), row.getAdtDt(), text(snapshot, "targetId"), text(snapshot, "clientIp"),
                text(snapshot, "description"),
                snapshot != null && snapshot.path("httpStatus").isNumber() ? snapshot.path("httpStatus").intValue() : null);
    }

    /** 원장 내용은 서버가 쓴 JSON 이지만, 읽지 못하는 행 하나가 목록 전체를 막지 않게 한다. */
    private JsonNode parse(String content) {
        try {
            return objectMapper.readTree(content);
        } catch (RuntimeException unreadable) {
            return null;
        }
    }

    private static String text(JsonNode snapshot, String field) {
        if (snapshot == null) return null;
        JsonNode value = snapshot.path(field);
        return value.isString() ? value.asString() : null;
    }
}
