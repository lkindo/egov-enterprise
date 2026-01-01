<%-- 로그인화면 (JPA 기반 리팩토링) - 문제가 되는 의존성 제거 - 헤더/푸터 인라인 통합 - 기존 CSS 디자인 유지 --%>
    <%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
        <%@ taglib prefix="c" uri="jakarta.tags.core" %>
            <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>

                <!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Language" content="ko">
                    <title>로그인 - 표준프레임워크 경량환경</title>

                    <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
                    <script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
                    <script src="<c:url value='/js/ui.js'/>"></script>

                    <script type="text/javascript">
                        function actionLogin() {
                            if (document.loginForm.id.value == "") {
                                alert("아이디를 입력하세요");
                                return false;
                            } else if (document.loginForm.password.value == "") {
                                alert("비밀번호를 입력하세요");
                                return false;
                            } else {
                                document.loginForm.action = "<c:url value='/uat/uia/actionLogin.do'/>";
                                document.loginForm.submit();
                            }
                        }

                        function setCookie(name, value, expires) {
                            document.cookie = name + "=" + escape(value) + "; path=/; expires=" + expires.toGMTString();
                        }

                        function getCookie(Name) {
                            var search = Name + "=";
                            if (document.cookie.length > 0) {
                                offset = document.cookie.indexOf(search);
                                if (offset != -1) {
                                    offset += search.length;
                                    end = document.cookie.indexOf(";", offset);
                                    if (end == -1) end = document.cookie.length;
                                    return unescape(document.cookie.substring(offset, end));
                                }
                            }
                            return "";
                        }

                        function saveid(form) {
                            var expdate = new Date();
                            if (form.checkId.checked)
                                expdate.setTime(expdate.getTime() + 1000 * 3600 * 24 * 30);
                            else
                                expdate.setTime(expdate.getTime() - 1);
                            setCookie("saveid", form.id.value, expdate);
                        }

                        function getid(form) {
                            form.checkId.checked = ((form.id.value = getCookie("saveid")) != "");
                        }

                        function fnInit() {
                            var messageElem = document.getElementById("loginMessage");
                            if (messageElem && messageElem.value != "") {
                                alert(messageElem.value);
                            }
                            getid(document.loginForm);
                        }
                    </script>
                </head>

                <body onload="fnInit();">
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
                                <div class="top_menu">
                                    <span class="t"><span>로그인정보 없음</span> &nbsp</span>
                                    <span class="d">로그인후 사용하십시오</span>
                                </div>
                                <!-- gnb -->
                                <div class="gnb">
                                    <ul>
                                        <c:forEach var="menu" items="${menuList}" varStatus="status">
                                            <li>
                                                <c:set var="menuUrl" value="#" />
                                                <c:choose>
                                                    <c:when test="${menu.id == 1000000}">
                                                        <c:set var="menuUrl"
                                                            value="/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA" />
                                                    </c:when>
                                                    <c:when test="${menu.id == 5000000 || menu.id == 6000000}">
                                                        <c:set var="menuUrl" value="#" />
                                                    </c:when>
                                                </c:choose>
                                                <a href="<c:url value='${menuUrl}'/>" <c:if
                                                    test="${menu.id >= 5000000}">class="manager"</c:if>>
                                                    <c:out value="${menu.menuNm}" />
                                                </a>
                                            </li>
                                        </c:forEach>
                                    </ul>
                                </div>

                                <!-- util menu -->
                                <div class="util_menu">
                                    <ul>
                                        <li><a href="#" class="allmenu" title="전체메뉴">전체메뉴</a></li>
                                    </ul>
                                </div>
                                <!-- //util menu -->

                                <!-- 전체메뉴 팝업 -->
                                <div class="all_menu">
                                    <div>
                                        <div class="inner">
                                            <c:forEach var="root" items="${menuList}" varStatus="status">
                                                <div <c:if test="${root.id >= 5000000}">class="admin"</c:if>>
                                                    <h2>
                                                        <c:out value="${root.menuNm}" />
                                                    </h2>
                                                    <ul>
                                                        <c:forEach var="child" items="${root.children}">
                                                            <li>
                                                                <c:set var="childUrl" value="#" />
                                                                <c:choose>
                                                                    <c:when test="${child.id == 1010000}">
                                                                        <c:set var="childUrl"
                                                                            value="/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA" />
                                                                    </c:when>
                                                                    <c:when test="${child.id == 1020000}">
                                                                        <c:set var="childUrl"
                                                                            value="/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC" />
                                                                    </c:when>
                                                                </c:choose>
                                                                <a href="<c:url value='${childUrl}'/>">
                                                                    <c:out value="${child.menuNm}" />
                                                                </a>
                                                            </li>
                                                        </c:forEach>
                                                    </ul>
                                                </div>
                                            </c:forEach>
                                        </div>
                                    </div>
                                </div>
                                <!-- //전체메뉴 팝업 -->
                            </div>
                        </div>
                        <!-- //Header -->

                        <div class="container" style="padding-bottom: 60px;">
                            <div class="sub_layout">
                                <div class="sub_in">
                                    <div class="layout">

                                        <!-- Location -->
                                        <div class="location">
                                            <ul>
                                                <li><a class="home" href="<c:url value='/'/>">Home</a></li>
                                                <li>사용자로그인</li>
                                            </ul>
                                        </div>
                                        <!-- //Location -->

                                        <div class="P_LOGIN">
                                            <h1>로그인</h1>
                                            <p class="txt">표준프레임워크 경량환경 내부업무 시스템에 오신것을 환영합니다.</p>
                                            <div class="loginbox">
                                                <form id="loginForm" name="loginForm" method="post"
                                                    action="<c:url value='/uat/uia/actionLogin.do'/>">
                                                    <fieldset>
                                                        <legend>로그인</legend>

                                                        <dl>
                                                            <dt><label for="id">아이디</label></dt>
                                                            <dd><input type="text" title="아이디를 입력하세요." id="id" name="id"
                                                                    maxlength="20" /></dd>
                                                        </dl>

                                                        <dl>
                                                            <dt><label for="password">비밀번호</label></dt>
                                                            <dd>
                                                                <input type="password" maxlength="25"
                                                                    title="비밀번호를 입력하세요." id="password" name="password"
                                                                    onkeydown="javascript:if (event.keyCode == 13) { actionLogin(); }" />
                                                            </dd>
                                                        </dl>

                                                        <a href="#" class="btn_login"
                                                            onclick="javascript:actionLogin(); return false;">로그인</a>

                                                        <div class="bot">
                                                            <label for="chk" class="f_chk">
                                                                <input type="checkbox" name="checkId" id="chk"
                                                                    title="ID 저장"
                                                                    onclick="javascript:saveid(document.loginForm);" />
                                                                <span>ID 저장</span>
                                                            </label>
                                                        </div>
                                                    </fieldset>
                                                    <input type="hidden" id="loginMessage" name="message"
                                                        value="<c:out value='${message}'/>" />
                                                    <input type="hidden" name="userSe" value="USR" />
                                                </form>
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