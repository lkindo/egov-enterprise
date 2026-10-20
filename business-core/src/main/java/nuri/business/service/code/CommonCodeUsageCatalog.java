package nuri.business.service.code;

import nuri.foundation.core.code.CommonCodeUsageContributor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * 이 제품이 읽는 공통코드 그룹과 그 사용처(기능별 {@link CommonCodeUsageContributor} 기여의 합).
 *
 * <p>공통코드 관리 화면은 그룹마다 이 목록으로 '이 제품이 읽음 / 읽지 않음'을 말한다. 기여는 그룹을 읽는 기능에 있으므로
 * 재사용 생성물에서 기능이 빠지면 그 사용처도 함께 빠진다 — 이 클래스는 그룹 이름을 하나도 들고 있지 않다.
 * 기여 목록은 기동 때 한 번 모은다(기여는 코드가 정한 상수라 실행 중에 바뀌지 않는다).
 */
@Component
public class CommonCodeUsageCatalog {

    private final Map<String, List<String>> usagesByGroup;

    @Autowired
    public CommonCodeUsageCatalog(ObjectProvider<CommonCodeUsageContributor> contributors) {
        this(contributors.orderedStream().toList());
    }

    /** 시험·수동 조립용 — 기여를 직접 받는다. */
    public CommonCodeUsageCatalog(Collection<? extends CommonCodeUsageContributor> contributors) {
        Map<String, List<String>> byGroup = new LinkedHashMap<>();
        for (CommonCodeUsageContributor contributor : Objects.requireNonNull(contributors, "contributors")) {
            Collection<CommonCodeUsageContributor.Usage> usages = contributor.commonCodeUsages();
            if (usages == null || usages.isEmpty()) {
                // 빈 기여는 '읽는다'고 등록하고 아무것도 말하지 않는 것이다 — 기동에서 막는다.
                throw new IllegalStateException("공통코드 사용처 기여가 비어 있습니다: " + contributor.getClass().getName());
            }
            for (CommonCodeUsageContributor.Usage usage : usages) {
                byGroup.merge(usage.groupId(), List.of(usage.description()),
                        (left, right) -> Stream.concat(left.stream(), right.stream()).distinct().toList());
            }
        }
        this.usagesByGroup = Map.copyOf(byGroup);
    }

    /** 그룹의 사용처 문장들. 이 제품이 읽지 않는 그룹이면 빈 목록이다. */
    public List<String> usagesOf(String groupId) {
        return groupId == null ? List.of() : usagesByGroup.getOrDefault(groupId, List.of());
    }
}
