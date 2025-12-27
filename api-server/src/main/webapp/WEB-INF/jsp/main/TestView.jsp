<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
    <%@ taglib prefix="c" uri="jakarta.tags.core" %>
        <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
            <!DOCTYPE html>
            <html>

            <head>
                <meta charset="UTF-8">
                <title>테스트 페이지</title>
            </head>

            <body>
                <h1>테스트 페이지</h1>
                <p>이 페이지가 보이면 JSP가 정상 작동합니다.</p>
                <p>bbsList size: ${fn:length(bbsList)}</p>
                <p>notiList size: ${fn:length(notiList)}</p>
            </body>

            </html>