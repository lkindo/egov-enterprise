package com.company.project.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;

/**
 * ë¹?ì¶©ëŒ ë°©ì?ë¥??„í•´ ê¸°ë³¸?ìœ¼ë¡œëŠ” ?„ì²´ ?´ë˜?¤ëª…???¬ìš©??
 * ?´ë…¸?Œì´??@Service, @Component ????ëª…ì‹œ?ì¸ ?´ë¦„???ˆëŠ” ê²½ìš°
 * AnnotationBeanNameGeneratorê°€ ?´ë? ë¨¼ì? ì²˜ë¦¬?˜ë©°,
 * ?´ë¦„???†ì„ ê²½ìš°?ë§Œ buildDefaultBeanName???¸ì¶œ?˜ì–´ ?„ì²´ ?´ë˜?¤ëª…??ë¹??´ë¦„?¼ë¡œ ?¬ìš©??
 */
public class FullBeanNameGenerator extends AnnotationBeanNameGenerator {
    @Override
    protected String buildDefaultBeanName(BeanDefinition definition) {
        return definition.getBeanClassName();
    }
}
