<%@ page language="java" contentType="text/html; charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui" %>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<link href="<c:url value='/css/egovframework/com/cmm/main.css' />" rel="stylesheet" type="text/css">
<title>eGovFrame 공통 컴포넌트</title>

    <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
    <script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
    <script src="<c:url value='/js/ui.js'/>"></script>
</head>
<body>
<div class="wrap">
<c:import url="/sym/mms/EgovHeader.do" />
<div class="container" style="padding-bottom: 60px;">
<div class="sub_layout">
<div class="sub_in">
<div class="layout">

<div id="footer">
	<div><strong class="footer_title_strong">Copyright(c)2018 eGovframework. All rights reserved.</strong></div>
</div>

</div>
</div>
</div>
</div>
<c:import url="/sym/mms/EgovFooter.do" />
</div>
</body>
</html>