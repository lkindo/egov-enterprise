<%-- 로그인화면 (JPA 기반 리팩토링) - 문제가 되는 의존성 제거 - 헤더/푸터 인라인 통합 - 기존 CSS 디자인 유지 --%>
    <%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
        <%@ taglib prefix="c" uri="jakarta.tags.core" %>
            <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>

                <!DOCTYPE html>
                <html lang="ko">

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
                        <c:import url="/sym/mms/EgovHeader.do" />
                        <!-- //Header -->

                        <div class="container" id="contents" style="padding-bottom: 60px;">
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
                                                            <dd><input type="text" title="아이디를 입력하세요." placeholder="아이디" id="id" name="id"
                                                                    maxlength="20" /></dd>
                                                        </dl>

                                                        <dl>
                                                            <dt><label for="password">비밀번호</label></dt>
                                                            <dd>
                                                                <input type="password" maxlength="25"
                                                                    title="비밀번호를 입력하세요." placeholder="비밀번호" id="password" name="password"
                                                                    onkeydown="javascript:if (event.keyCode == 13) { actionLogin(); }" />
                                                            </dd>
                                                        </dl>

                                                        <button type="button" class="btn_login"
                                                            onclick="actionLogin();">로그인</button>

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
                                                        value="${loginMessage}" />
                                                    <input type="hidden" name="userSe" value="USR" />
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <c:import url="/sym/mms/EgovFooter.do" />
                        <!--// Footer -->

                    </div>

                </body>

                </html>