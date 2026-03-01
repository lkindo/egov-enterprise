package com.company.project.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;

/**
 * �?충돌 방�?�??�해 기본?�으로는 ?�체 ?�래?�명???�용??
 * ?�노?�이??@Service, @Component ????명시?�인 ?�름???�는 경우
 * AnnotationBeanNameGenerator가 ?��? 먼�? 처리?�며,
 * ?�름???�을 경우?�만 buildDefaultBeanName???�출?�어 ?�체 ?�래?�명??�??�름?�로 ?�용??
 */
public class FullBeanNameGenerator extends AnnotationBeanNameGenerator {
    @Override
    protected String buildDefaultBeanName(BeanDefinition definition) {
        return definition.getBeanClassName();
    }
}
