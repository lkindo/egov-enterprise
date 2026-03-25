package com.company.project.foundation.core.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
public class ApplicationContextProvider implements ApplicationContextAware {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationContextProvider.class);
    private static ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext context) throws BeansException {
        LOGGER.info("ApplicationContextProvider.setApplicationContext called: {}", context);
        applicationContext = context;
    }

    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    public static <T> T getBean(Class<T> clazz) {
        LOGGER.debug("ApplicationContextProvider.getBean(Class) called for: {}", clazz);
        if (applicationContext == null) {
            LOGGER.warn("ApplicationContextProvider: applicationContext is NULL!");
            return null;
        }
        try {
            return applicationContext.getBean(clazz);
        } catch (Exception e) {
            LOGGER.error("ApplicationContextProvider: Error getting bean: {}", e.getMessage(), e);
            return null;
        }
    }

    public static Object getBean(String name) {
        LOGGER.debug("ApplicationContextProvider.getBean(String) called for: {}", name);
        if (applicationContext == null) {
            LOGGER.warn("ApplicationContextProvider: applicationContext is NULL!");
            return null;
        }
        return applicationContext.getBean(name);
    }
}
