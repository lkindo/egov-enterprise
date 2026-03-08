package com.company.project.api.controller.main;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.HttpServletResponse;

@Controller

public class TestMvcController {

    public TestMvcController() {

        System.out.println(">>> TestMvcController BEAN CREATED <<<");

    }

    @GetMapping("/test/mvc.do")

    public String testMvc(HttpServletResponse response) throws Exception {

        System.err.println(">>> TestMvcController.testMvc ENTERED <<<");

        response.setContentType("text/plain");

        response.getWriter().write("SUCCESS from TestMvcController");

        return null;

    }

}
