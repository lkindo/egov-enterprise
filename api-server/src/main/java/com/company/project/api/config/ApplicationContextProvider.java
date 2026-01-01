package com.company.project.api.config;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
public class ApplicationContextProvider implements ApplicationContextAware {

    private static ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext context) throws BeansException {
        System.out.println(">>> ApplicationContextProvider.setApplicationContext called: " + context);
        applicationContext = context;
    }

    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    public static <T> T getBean(Class<T> clazz) {
        System.out.println(">>> ApplicationContextProvider.getBean(Class) called for: " + clazz);
        if (applicationContext == null) {
            System.out.println(">>> ApplicationContextProvider: applicationContext is NULL!");
            return null;
        }
        try {
            return applicationContext.getBean(clazz);
        } catch (Exception e) {
            System.out.println(">>> ApplicationContextProvider: Error getting bean: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    public static Object getBean(String name) {
        System.out.println(">>> ApplicationContextProvider.getBean(String) called for: " + name);
        if (applicationContext == null) {
            System.out.println(">>> ApplicationContextProvider: applicationContext is NULL!");
            return null;
        }
        return applicationContext.getBean(name);
    }
}
