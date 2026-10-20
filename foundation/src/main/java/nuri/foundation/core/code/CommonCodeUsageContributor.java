package nuri.foundation.core.code;

import java.util.Collection;
import java.util.regex.Pattern;

/**
 * 기능 모듈이 <b>어느 공통코드 그룹을 읽고, 그 그룹을 고치면 무엇이 바뀌는지</b> 알려 주는 포트(사용처).
 *
 * <p>[왜 필요한가] 공통코드 그룹은 수십 개지만 제품 코드가 실제로 읽는 그룹은 몇 개뿐이다. 관리 화면에서는 모든 그룹이 같아
 * 보여서, 관리자는 아무 효과 없는 그룹을 고치거나 반대로 결재 업무 구분처럼 상신 검증에 쓰이는 그룹을 사용 안 함으로 바꿔
 * 업무를 막을 수 있었다. 화면은 이 포트로 모은 사용처로 그룹마다 '이 제품이 읽음 / 읽지 않음'을 말하고, 영향이 있는 변경
 * 전에 그 사용처를 보이며 확인을 받는다.
 *
 * <p>[왜 포트인가] 그룹을 읽는 코드는 선택 기능(business-app)에 흩어져 있다. 공통코드 관리(business-core)가 그 사실을
 * 상수로 들고 있으면 기능을 뺀 재사용 생성물에서 없는 기능의 사용처를 말한다. 기여를 그 그룹을 읽는 기능에 두면 기능이
 * 빠질 때 사용처도 함께 빠진다({@code LoginIdReferenceContributor} 와 같은 방식).
 *
 * <p>[정본과 대조] 기능 선언 {@code config/modules/*.json} 의 {@code owns.commonCodeGroups} 가 그룹 소유의 정본이다.
 * {@code scripts/reusable-reference-data.test.mjs} 가 생산 Java 가 읽는 그룹 · 이 포트의 기여 · 기능 선언을 기능마다
 * 같은 집합으로 대조한다 — 그룹을 새로 읽으면서 기여를 빠뜨리면 화면이 '읽지 않음'이라고 말하므로 그 계약이 막는다.
 */
public interface CommonCodeUsageContributor {

    /** 이 기능이 읽는 공통코드 그룹과 그 사용처. 비어 있으면 안 된다. */
    Collection<Usage> commonCodeUsages();

    /**
     * 공통코드 그룹 하나의 사용처.
     *
     * @param groupId     공통코드 그룹 ID(예: {@code COM075}). 기능 선언과 같은 형식만 받는다.
     * @param description 관리자에게 보이는 문장 — 무엇이 이 그룹을 읽고, 이름·사용 여부를 고치면 무엇이 바뀌는지.
     */
    record Usage(String groupId, String description) {

        private static final Pattern GROUP_ID = Pattern.compile("[A-Z0-9]{1,12}");
        /** 화면에 그대로 보이는 문장이라 길이를 묶는다. */
        static final int DESCRIPTION_MAX = 300;

        public Usage {
            if (groupId == null || !GROUP_ID.matcher(groupId).matches()) {
                throw new IllegalArgumentException("공통코드 그룹 ID 형식이 아닙니다: " + groupId);
            }
            if (description == null || description.isBlank() || description.length() > DESCRIPTION_MAX) {
                throw new IllegalArgumentException("공통코드 사용처 설명은 1~" + DESCRIPTION_MAX + "자여야 합니다: " + groupId);
            }
        }
    }
}
