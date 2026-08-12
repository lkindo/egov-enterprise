package nuri.foundation.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.GenericBeanDefinition;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("FullBeanNameGenerator 단위 테스트")
class FullBeanNameGeneratorTest {

    @Test
    @DisplayName("명시 이름이 없는 빈은 전체 클래스명을 사용한다")
    void usesFullyQualifiedClassName() {
        GenericBeanDefinition definition = new GenericBeanDefinition();
        definition.setBeanClass(String.class);

        String beanName = new ExposedFullBeanNameGenerator().defaultName(definition);

        assertThat(beanName).isEqualTo(String.class.getName());
    }

    private static final class ExposedFullBeanNameGenerator extends FullBeanNameGenerator {
        private String defaultName(GenericBeanDefinition definition) {
            return buildDefaultBeanName(definition);
        }
    }
}
