<%-- 메인화면 (JPA 기반 리팩토링) - 문제가 되는 의존성 제거 - 헤더/푸터 인라인 통합 - 기존 CSS 디자인 유지 --%>
    <%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
        <%@ taglib prefix="c" uri="jakarta.tags.core" %>
            <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>

                <!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>표준프레임워크 경량환경 내부업무템플릿</title>

                    <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
                    <script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
                    <script src="<c:url value='/js/ui.js'/>"></script>
                </head>

                <body>
                    <noscript>자바스크립트를 지원하지 않는 브라우저에서는 일부 기능을 사용하실 수 없습니다.</noscript>

                    <!-- Skip navigation -->
                    <a href="#contents" class="skip_navi">본문 바로가기</a>

                    <div class="wrap">

                        <!-- Header -->
                        <div class="header">
                            <div class="inner">
                                <div class="left_col">
                                    <h1 class="logo">
                                        <a href="<c:url value='/cmm/main/mainPage.do'/>">
                                            <img src="<c:url value='/images/logo.png'/>"
                                                alt="표준프레임워크 포털 eGovFrame 샘플 포털">
                                        </a>
                                    </h1>
                                </div>

                                <c:choose>
                                    <c:when test="${not empty loginUser}">
                                        <div class="top_menu">
                                            <span class="t"><span>
                                                    <c:out value="${loginUser.name}" /> 님
                                                </span>의 최종접속정보는 </span>
                                            <span class="d">환영합니다.</span>
                                            <a href="<c:url value='/uat/uia/actionLogout.do'/>"
                                                class="btn btn_blue_15 w_90">로그아웃</a>
                                        </div>
                                    </c:when>
                                    <c:otherwise>
                                        <div class="top_menu">
                                            <span class="t"><span>로그인정보 없음</span> &nbsp</span>
                                            <span class="d">로그인후 사용하십시오</span>
                                            <a href="<c:url value='/uat/uia/egovLoginUsr.do'/>"
                                                class="btn btn_blue_15 w_90">로그인</a>
                                        </div>
                                    </c:otherwise>
                                </c:choose>

                                <!-- gnb -->
                                <div class="gnb">
                                    <ul>
                                        <c:forEach var="menu" items="${menuList}" varStatus="status">
                                            <li>
                                                <a href="<c:url value='${menu.chkURL}'/>" <c:if
                                                    test="${menu.id >= 5000000}">class="manager"</c:if>>
                                                    <c:out value="${menu.menuNm}" />
                                                </a>
                                                <!-- Submenu for All Menu view -->
                                                <c:if test="${not empty menu.children}">
                                                    <div class="depth2_wrap">
                                                        <ul>
                                                            <c:forEach var="child" items="${menu.children}">
                                                                <li>
                                                                    <a href="<c:url value='${child.chkURL}'/>">
                                                                        <c:out value="${child.menuNm}" />
                                                                    </a>
                                                                    <c:if test="${not empty child.children}">
                                                                        <div class="depth3_wrap">
                                                                            <ul>
                                                                                <c:forEach var="grandchild"
                                                                                    items="${child.children}">
                                                                                    <li><a
                                                                                            href="<c:url value='${grandchild.chkURL}'/>">
                                                                                            <c:out
                                                                                                value="${grandchild.menuNm}" />
                                                                                        </a></li>
                                                                                </c:forEach>
                                                                            </ul>
                                                                        </div>
                                                                    </c:if>
                                                                </li>
                                                            </c:forEach>
                                                        </ul>
                                                    </div>
                                                </c:if>
                                            </li>
                                        </c:forEach>
                                    </ul>
                                </div>
                                <!-- //gnb -->

                                <!-- util menu -->
                                <div class="util_menu">
                                    <ul>
                                        <li><a href="#" class="allmenu" title="전체메뉴">전체메뉴</a></li>
                                    </ul>
                                </div>
                                <!-- //util menu -->

                                <!-- 전체메뉴 팝업 -->
                                <!-- 전체메뉴 팝업 (Legacy Removed) 
                                <div class="all_menu">
                                   ... (Legacy Markup Hidden)
                                </div>
                                -->
                            </div>
                        </div>
                        <!-- //Header -->

                        <div class="container main">
                            <div class="P_MAIN">
                                <div class="inner">
                                    <p class="visual">
                                        <span class="t_1">표준프레임워크</span>
                                        <span class="t_2">경량환경 내부업무</span>
                                        <span class="t_3">표준프레임워크 경량환경 내부업무에 대한 전반적인 지원을 약속합니다.</span>
                                    </p>
                                </div>

                                <div class="bot">
                                    <div class="col">
                                        <div class="left_col">
                                            <div class="box">
                                                <div class="head">
                                                    <h2>오늘의 <span>할일</span></h2>
                                                    <a href="<c:url value='/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC'/>"
                                                        class="more">더보기</a>
                                                </div>
                                                <ul class="list">
                                                    <c:choose>
                                                        <c:when test="${fn:length(bbsList) > 0}">
                                                            <c:forEach var="result" items="${bbsList}"
                                                                varStatus="status">
                                                                <li>
                                                                    <a
                                                                        href="<c:url value='/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC'/>">
                                                                        <c:out value="${result.nttSj}" />
                                                                    </a>
                                                                    <span>
                                                                        <c:out value="${result.frstRegisterPnttmStr}" />
                                                                    </span>
                                                                </li>
                                                            </c:forEach>
                                                        </c:when>
                                                        <c:otherwise>
                                                            <li>
                                                                <a href="#">등록된 할일이 없습니다.</a>
                                                                <span>-</span>
                                                            </li>
                                                        </c:otherwise>
                                                    </c:choose>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="right_col">
                                            <div class="box">
                                                <div class="head">
                                                    <h2>최신 업무공지 <span>정보</span></h2>
                                                    <a href="<c:url value='/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA'/>"
                                                        class="more">더보기</a>
                                                </div>
                                                <div class="list">
                                                    <table>
                                                        <colgroup>
                                                            <col style="width: auto;">
                                                            <col style="width: 80px">
                                                            <col style="width: 110px">
                                                        </colgroup>
                                                        <tbody>
                                                            <c:choose>
                                                                <c:when test="${fn:length(notiList) > 0}">
                                                                    <c:forEach var="result" items="${notiList}"
                                                                        varStatus="status">
                                                                        <tr>
                                                                            <td>
                                                                                <a
                                                                                    href="<c:url value='/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA'/>">
                                                                                    <c:out value="${result.nttSj}" />
                                                                                </a>
                                                                                <span>NEW</span>
                                                                            </td>
                                                                            <td class="al_c">
                                                                                <c:out value="${result.ntcrNm}" />
                                                                            </td>
                                                                            <td class="al_r date">
                                                                                <c:out
                                                                                    value="${result.frstRegisterPnttmStr}" />
                                                                            </td>
                                                                        </tr>
                                                                    </c:forEach>
                                                                </c:when>
                                                                <c:otherwise>
                                                                    <tr>
                                                                        <td>등록된 공지사항이 없습니다.</td>
                                                                        <td class="al_c">-</td>
                                                                        <td class="al_r date">-</td>
                                                                    </tr>
                                                                </c:otherwise>
                                                            </c:choose>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="footer">
                            <div class="inner">
                                <h1>
                                    <a href="#">
                                        <img src="<c:url value='/images/logo_footer.png'/>" alt="표준프레임워크 포털 eGovFrame">
                                    </a>
                                </h1>

                                <div class="mid">
                                    <address>
                                        대표문의메일 : egovframesupport@gmail.com | 대표전화 : 0000-0000 (000-0000-0000)<br>
                                        호환성확인 : 000-0000-0000 | 교육문의 : 000-0000-0000
                                    </address>
                                    <p class="copy">Copyright © 2021 Ministry Of The Interior And Safety. All Rights
                                        Reserved.</p>
                                </div>

                                <div class="right_col">
                                    <a href="#"><img src="<c:url value='/images/banner01.png'/>" alt="행정안전부"></a>
                                    <a href="#"><img src="<c:url value='/images/banner02.png'/>"
                                            alt="NIA 한국지능정보사회진흥원"></a>
                                </div>
                            </div>
                        </div>
                        <!-- //Footer -->

                    </div>

                </body>

                </html>