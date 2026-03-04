package com.company.project;

import jakarta.annotation.PostConstruct;

import org.springframework.stereotype.Component;

@Component

public class DebugBean {

    @PostConstruct

    public void init() {

        System.out.println(">>> REF_DEBUG: COM.COMPANY.PROJECT SCANNING WORKS! <<<");

    }

}