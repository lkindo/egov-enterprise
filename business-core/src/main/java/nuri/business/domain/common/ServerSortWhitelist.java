package nuri.business.domain.common;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Sort;

import java.util.Locale;
import java.util.Map;

/**
 * 서버 정렬의 허용 목록(Wave 4, GAP-UI-001). 화면이 보내는 {@code sortBy}·{@code sortDir} 을 인덱스가 받치는 엔티티 속성의 고정
 * {@link Sort} 로만 바꾼다 — 임의 속성 이름을 정렬에 쓰지 않는다(HQL 주입·미인덱스 전체 정렬 방지). 목록 밖의 키·방향은 조용히
 * 무시하지 않고 400 이다(무시하면 화면은 정렬된 결과로 읽는다). {@code sortBy} 가 비면 정렬 없음(저장소 기본 순서)이다.
 */
public final class ServerSortWhitelist {

    private final Map<String, String> properties;

    private ServerSortWhitelist(Map<String, String> properties) {
        this.properties = Map.copyOf(properties);
    }

    /** API 키 → 엔티티 속성. 키는 화면 열의 serverSortKey 와 같다. */
    public static ServerSortWhitelist of(Map<String, String> apiKeyToProperty) {
        return new ServerSortWhitelist(apiKeyToProperty);
    }

    /**
     * @param sortBy  허용 키 또는 빈 값
     * @param sortDir {@code asc}·{@code desc}(대소문자 무관) 또는 빈 값(오름차순)
     * @return 허용 속성의 정렬, 키가 비면 {@link Sort#unsorted()}
     * @throws BusinessException INVALID_INPUT_VALUE(400) — 목록 밖의 키·방향
     */
    public Sort resolve(String sortBy, String sortDir) {
        String key = sortBy == null || sortBy.isBlank() ? null : sortBy.trim();
        String dir = sortDir == null || sortDir.isBlank() ? null : sortDir.trim().toLowerCase(Locale.ROOT);
        if (dir != null && !dir.equals("asc") && !dir.equals("desc")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "정렬 방향은 asc 또는 desc 입니다.");
        }
        if (key == null) {
            if (dir != null) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "정렬 방향만 보낼 수 없습니다. 정렬 기준을 함께 보내 주세요.");
            }
            return Sort.unsorted();
        }
        String property = properties.get(key);
        if (property == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "정렬할 수 없는 항목입니다. 허용: " + String.join(", ", new java.util.TreeSet<>(properties.keySet())));
        }
        return Sort.by("desc".equals(dir) ? Sort.Direction.DESC : Sort.Direction.ASC, property);
    }
}
