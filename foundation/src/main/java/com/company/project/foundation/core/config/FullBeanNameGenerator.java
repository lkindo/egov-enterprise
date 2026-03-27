package com.company.project.foundation.core.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;

/**
 * 빈 충돌 방지를 위해 기본적으로는 전체 클래스명을 사용함.
 * 어노테이션 @Service, @Component 등에 명시적인 이름이 있는 경우
 * AnnotationBeanNameGenerator가 이를 먼저 처리하며,
 * 이름이 없을 경우에만 buildDefaultBeanName이 호출되어 전체 클래스명을 빈 이름으로 사용함.
 */
public class FullBeanNameGenerator extends AnnotationBeanNameGenerator {
    @Override
    protected String buildDefaultBeanName(BeanDefinition definition) {
        String beanName = definition.getBeanClassName();
        if (beanName == null) {
            return super.buildDefaultBeanName(definition);
        }
        return beanName;
    }
}
