package nuri.business.domain.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link BaseSearchDto#toPageable()} 경계 테스트.
 *
 * <p>[2026-08-09 신설] 이 변환은 종전에 서비스 계층에 <b>13개소·10개 파일로 복제</b>돼 있었다.
 * 뮤테이션 테스트가 그 복제를 드러냈다 — 같은 모양의 뮤턴트가 호출부마다 따로 살아남아,
 * 인증 스코프 한 곳에서만 생존 16개 중 10개가 이 두 줄이었다.
 *
 * <p>추출했으므로 검증 지점도 하나다. 여기가 유일한 방어선이므로
 * <b>경계를 전수로</b> 본다 — 뮤턴트가 여기서 살아남으면 13개 호출부가 한꺼번에 무방비가 된다.
 */
@DisplayName("BaseSearchDto 페이징 변환 테스트")
class BaseSearchDtoPageableTest {

    private static BaseSearchDto dto(int pageIndex, int pageUnit) {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(pageIndex);
        vo.setPageUnit(pageUnit);
        return vo;
    }

    @Nested
    @DisplayName("페이지 번호 변환 (1-based → 0-based)")
    class PageIndexConversion {

        @Test
        @DisplayName("1-based 화면 번호를 0-based 로 낮춘다")
        void convertsOneBasedToZeroBased() {
            assertThat(dto(1, 10).toPageable().getPageNumber()).isEqualTo(0);
            assertThat(dto(2, 10).toPageable().getPageNumber()).isEqualTo(1);
            assertThat(dto(3, 10).toPageable().getPageNumber()).isEqualTo(2);
            // 뺄셈을 덧셈으로 바꾼 뮤턴트(`+ 1`)는 위 세 단언에서 전부 죽는다.
            assertThat(dto(100, 10).toPageable().getPageNumber()).isEqualTo(99);
        }

        @Test
        @DisplayName("0 이나 음수는 첫 페이지로 수렴한다 — PageRequest 는 음수를 거부한다")
        void clampsNonPositiveToFirstPage() {
            // Math.max(0, ...) 를 지운 뮤턴트는 PageRequest.of(-1, ..) 로 IllegalArgumentException 을 낸다.
            assertThat(dto(0, 10).toPageable().getPageNumber()).isEqualTo(0);
            assertThat(dto(-1, 10).toPageable().getPageNumber()).isEqualTo(0);
            assertThat(dto(-999, 10).toPageable().getPageNumber()).isEqualTo(0);
        }

        @Test
        @DisplayName("⚠ 기존 결함: Integer.MIN_VALUE 는 오버플로로 clamp 를 빠져나간다")
        void knownDefect_integerMinValueOverflowsPastTheClamp() {
            // `pageIndex - 1` 이 Integer.MIN_VALUE 에서 오버플로해 Integer.MAX_VALUE 가 되고,
            //   Math.max(0, MAX_VALUE) 는 그대로 MAX_VALUE 다 — "음수를 0 으로 막는다" 는 의도가 무력화된다.
            //
            //   ⚠ 이것은 **기존 13개 호출부가 모두 갖고 있던 결함**이며, 추출로 새로 생긴 것이 아니다.
            //   이 PR 은 "거동 동일 추출" 이라 고치지 않고 현행을 고정한다.
            //   **이 단언은 올바른 거동이 아니라 결함을 기록한 것이다** — 정정 시 이 테스트를 함께 바꾼다.
            //
            //   실제 영향: 거대한 offset 이 되어 빈 페이지가 나온다(Spring 의 getOffset() 은 long 이라
            //   재오버플로하지는 않는다). 크래시나 권한 우회는 아니다.
            assertThat(dto(Integer.MIN_VALUE, 10).toPageable().getPageNumber())
                    .as("기존 결함 기록 — 첫 페이지(0)로 수렴하지 않는다").isEqualTo(Integer.MAX_VALUE);
        }

        @Test
        @DisplayName("기본 pageIndex 는 1 이므로 변환하면 첫 페이지다")
        void defaultDtoStartsAtFirstPage() {
            assertThat(new BaseSearchDto().toPageable().getPageNumber()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("페이지 크기 결정")
    class PageUnitResolution {

        @Test
        @DisplayName("양수 pageUnit 은 그대로 쓴다")
        void usesPositivePageUnitAsIs() {
            assertThat(dto(1, 1).toPageable().getPageSize()).isEqualTo(1);
            assertThat(dto(1, 15).toPageable().getPageSize()).isEqualTo(15);
            assertThat(dto(1, 1000).toPageable().getPageSize()).isEqualTo(1000);
        }

        @Test
        @DisplayName("0 이하는 기본값 10 으로 대체한다")
        void fallsBackToDefaultForNonPositive() {
            // 경계를 옮긴 뮤턴트(`>= 0`)는 pageUnit=0 에서 PageRequest.of(.., 0) 이 되어
            // IllegalArgumentException 으로 죽는다.
            assertThat(dto(1, 0).toPageable().getPageSize()).isEqualTo(BaseSearchDto.DEFAULT_PAGE_UNIT);
            assertThat(dto(1, -5).toPageable().getPageSize()).isEqualTo(BaseSearchDto.DEFAULT_PAGE_UNIT);
        }

        @Test
        @DisplayName("경계값 1 은 기본값으로 대체되지 않는다")
        void oneIsAValidPageUnit() {
            // `> 0` 을 `> 1` 로 옮긴 뮤턴트는 여기서 10 을 돌려주어 죽는다.
            assertThat(dto(1, 1).toPageable().getPageSize()).isEqualTo(1);
        }

        @Test
        @DisplayName("기본값 상수는 10 이다")
        void defaultPageUnitIsTen() {
            assertThat(BaseSearchDto.DEFAULT_PAGE_UNIT).isEqualTo(10);
        }

        @Test
        @DisplayName("pageSize 필드가 아니라 pageUnit 이 기준이다")
        void usesPageUnitNotPageSizeField() {
            // ⚠ 이 DTO 의 pageSize 는 **페이지 네비게이션 사이즈**(하단 페이지 번호 개수)이지
            //   페이지당 레코드 수가 아니다. 이름만 보고 바꾸면 페이징이 조용히 어긋난다.
            BaseSearchDto vo = dto(1, 25);
            vo.setPageSize(3);

            assertThat(vo.toPageable().getPageSize())
                    .as("pageUnit(25)을 써야 한다 — pageSize(3)가 아니다").isEqualTo(25);
        }
    }

    @Nested
    @DisplayName("정렬 오버로드")
    class SortOverload {

        @Test
        @DisplayName("정렬을 지정하면 페이징 규칙은 그대로 두고 정렬만 얹는다")
        void appliesSortWithoutChangingPaging() {
            Pageable pageable = dto(3, 0).toPageable(Sort.by("authrtCd").ascending());

            assertThat(pageable.getPageNumber()).isEqualTo(2);
            assertThat(pageable.getPageSize()).isEqualTo(BaseSearchDto.DEFAULT_PAGE_UNIT);
            Sort.Order order = pageable.getSort().getOrderFor("authrtCd");
            assertThat(order).isNotNull();
            assertThat(order.isAscending()).isTrue();
        }

        @Test
        @DisplayName("정렬 없는 변환은 정렬이 비어 있다")
        void unsortedWhenNoSortGiven() {
            assertThat(dto(1, 10).toPageable().getSort().isSorted()).isFalse();
        }

        @Test
        @DisplayName("null 정렬은 거부한다 — 조용히 무정렬로 떨어뜨리지 않는다")
        void rejectsNullSort() {
            // 무정렬로 삼키면 "정렬했다고 믿는데 안 된" 상태가 되어 목록 순서가 비결정적이 된다.
            assertThatThrownBy(() -> dto(1, 10).toPageable(null))
                    .isInstanceOf(NullPointerException.class);
        }
    }
}
