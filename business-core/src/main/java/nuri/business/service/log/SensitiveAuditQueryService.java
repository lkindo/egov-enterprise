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
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE
                || (actorId != null && actorId.length() > 20) || (operation != null && operation.length() > 100)) {
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
        return repository.findAll(where, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "logSn")))
                .map(this::toEntry);
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
