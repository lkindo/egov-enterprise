package nuri.business.service.code;

import nuri.business.service.log.SystemLogCommonCodeUsageContributor;
import nuri.foundation.core.code.CommonCodeUsageContributor;
import nuri.foundation.core.code.CommonCodeUsageContributor.Usage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.beans.factory.support.RootBeanDefinition;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CommonCodeUsageCatalog — 기능 기여로 모은 공통코드 사용처")
class CommonCodeUsageCatalogTest {

    @Test
    @DisplayName("기여한 그룹은 사용처 문장을, 기여가 없는 그룹은 빈 목록을 돌려준다")
    void returnsUsagesOfContributedGroupsOnly() {
        var catalog = new CommonCodeUsageCatalog(List.of(
                () -> List.of(new Usage("COM075", "결재 업무 구분")),
                () -> List.of(new Usage("COM009", "게시판 속성"))));

        assertThat(catalog.usagesOf("COM075")).containsExactly("결재 업무 구분");
        assertThat(catalog.usagesOf("COM009")).containsExactly("게시판 속성");
        assertThat(catalog.usagesOf("COM039")).isEmpty();
        assertThat(catalog.usagesOf(null)).isEmpty();
    }

    @Test
    @DisplayName("같은 그룹을 두 기능이 읽으면 두 사용처를 모두 말하고, 같은 문장은 한 번만 싣는다")
    void mergesUsagesOfTheSameGroup() {
        var catalog = new CommonCodeUsageCatalog(List.of(
                () -> List.of(new Usage("COM075", "결재 업무 구분"), new Usage("COM075", "결재 업무 구분")),
                () -> List.of(new Usage("COM075", "결재선 추천"))));

        assertThat(catalog.usagesOf("COM075")).containsExactly("결재 업무 구분", "결재선 추천");
    }

    @Test
    @DisplayName("빈 기여는 기동에서 거부한다 — '읽는다'고 등록하고 아무것도 말하지 않는 기여를 두지 않는다")
    void rejectsEmptyContribution() {
        CommonCodeUsageContributor empty = List::of;
        CommonCodeUsageContributor nothing = () -> null;

        assertThatThrownBy(() -> new CommonCodeUsageCatalog(List.of(empty)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("비어 있습니다");
        assertThatThrownBy(() -> new CommonCodeUsageCatalog(List.of(nothing)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("비어 있습니다");
    }

    @Test
    @DisplayName("스프링은 등록된 기여 빈을 모두 모은다 — 기능이 빠진 구성에서는 그 기여도 없다")
    void springCollectsRegisteredContributors() {
        var factory = new DefaultListableBeanFactory();
        factory.registerBeanDefinition("systemLog", new RootBeanDefinition(SystemLogCommonCodeUsageContributor.class));

        var catalog = new CommonCodeUsageCatalog(factory.getBeanProvider(CommonCodeUsageContributor.class));

        assertThat(catalog.usagesOf("COM033")).singleElement().asString().contains("시스템 로그");
        assertThat(new CommonCodeUsageCatalog(new DefaultListableBeanFactory()
                .getBeanProvider(CommonCodeUsageContributor.class)).usagesOf("COM033")).isEmpty();
    }

    @Test
    @DisplayName("공통 기반의 시스템 로그 기여는 COM033 하나를 말하고, 이름을 고쳐도 화면이 바뀌지 않는다는 사실을 숨기지 않는다")
    void systemLogContributionStatesItsRealEffect() {
        assertThat(new SystemLogCommonCodeUsageContributor().commonCodeUsages())
                .singleElement()
                .satisfies(usage -> {
                    assertThat(usage.groupId()).isEqualTo("COM033");
                    assertThat(usage.description()).contains("화면은 바뀌지 않습니다");
                });
    }
}
