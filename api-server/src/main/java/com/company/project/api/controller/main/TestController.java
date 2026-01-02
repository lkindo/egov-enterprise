package com.company.project.api.controller.main;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class TestController {

    @PostConstruct
    public void init() {
        System.out.println(">>> TestController BEAN CREATED <<<");
    }

    @GetMapping("/test/hello")
    @ResponseBody
    public String hello() {
        return "Hello World - MVC Works";
    }
}
