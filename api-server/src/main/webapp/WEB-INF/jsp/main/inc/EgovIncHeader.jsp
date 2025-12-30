<%-- Class Name : EgovIncHeader.jsp Description : 화면상단 Header(include) Modification Information 수정일 수정자 수정내용 ----------
    -------- --------------------------- 2011.08.31 JJY 경량환경 버전 생성 author : 실행환경개발팀 JJY since : 2011.08.31 --%>
    <%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
        <%@ page import="egovframework.com.cmm.LoginVO" %>
            <%@ taglib prefix="c" uri="jakarta.tags.core" %>
                <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>

                    <script src="<c:url value='/js/jquery.js'/>"></script>
                    <script src="<c:url value='/js/jqueryui.js'/>"></script>
                    <link rel="stylesheet" href="<c:url value='/css/jqueryui.css'/>">

                    <script type="text/javaScript" language="javascript">

function fn_egov_modal_create(){
	
    var $dialog = $('<div id="modalPan"></div>')
	.html('<iframe style="border: 0px; " src="' + "<c:url value='/EgovPageLink.do'/>?" + "linkIndex=" + 3 +'" width="100%" height="100%"></iframe>')
	.dialog({
    	autoOpen: false,
        modal: true,
        width: 1250,
        height: 950
	});
    $(".ui-dialog-titlebar").hide();
	$dialog.dialog('open');
}

/**********************************************************
 * 모달 종료 버튼
 ******************************************************** */
function fn_egov_modal_remove() {
	$('#modalPan').remove();
}

</script>

                    <!-- Header -->
                    <div class="header">
                        <div class="inner">
                            <div class="left_col">
                                <h1 class="logo"><a href="<c:url value='/cmm/main/mainPage.do'/>"><img
                                            src="<c:url value='/images/logo.png'/>"
                                            alt="표준프레임워크 포털 eGovFrame 샘플 포털"></a></h1>
                                <a class="go" href="#LINK" onclick="fn_egov_modal_create(); return false;"><img
                                        src="<c:url value='/images/ico_question.png'/>" alt="메뉴구성 설명"></a>
                            </div>

                            <% LoginVO loginVO=(LoginVO)session.getAttribute("LoginVO"); if(loginVO==null){ %>
                                <div class="top_menu">
                                    <span class="t"><span>로그인정보 없음</span> &nbsp</span>
                                    <span class="d">로그인후 사용하십시오</span>
                                    <a href="<c:url value='/uat/uia/egovLoginUsr.do'/>"
                                        class="btn btn_blue_15 w_90">로그인</a>
                                </div>
                                <% }else{ %>
                                    <c:set var="loginName" value="<%= loginVO.getName()%>" />
                                    <div class="top_menu">
                                        <span class="t"><span onclick="alert('개인정보 확인 등의 링크 제공'); return false;"
                                                style="cursor: pointer;">
                                                <c:out value="${loginName}" /> 님
                                            </span>의 최종접속정보는 </span>
                                        <span class="d">2021-06-30 12:45 입니다.</span>
                                        <a href="<c:url value='/uat/uia/actionLogout.do'/>"
                                            class="btn btn_blue_15 w_90">로그아웃</a>
                                    </div>
                                    <% } %>



                                        <!-- gnb -->
                                        <div class="gnb">
                                            <ul>
                                                <c:forEach var="result" items="${list_headmenu}" varStatus="status">
                                                    <li>
                                                        <a href="#" onclick="goMenuPage('<c:out value="
                                                            ${result.menuNo}" />');" class="<c:if
                                                            test='${result.menuOrdr >= 5}'>manager</c:if>">
                                                        <c:out value="${result.menuNm}" />
                                                        </a>
                                                        <!-- Submenu for All Menu view -->
                                                        <c:if test="${fn:length(result.children) > 0}">
                                                            <div class="depth2_wrap">
                                                                <ul>
                                                                    <c:forEach var="child" items="${result.children}">
                                                                        <li>
                                                                            <a href="<c:url value='${child.chkURL}'/>">
                                                                                <c:out value="${child.menuNm}" />
                                                                            </a>
                                                                            <c:if
                                                                                test="${fn:length(child.children) > 0}">
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
                                                <c:if test="${fn:length(list_headmenu) == 0 }">
                                                    <li>등록된 메뉴가 없습니다.</li>
                                                </c:if>
                                            </ul>
                                        </div>
                                        <!-- gnb -->

                                        <!-- util menu -->
                                        <div class="util_menu">
                                            <ul>
                                                <li><a href="" class="allmenu" title="전체메뉴">전체메뉴</a></li>
                                            </ul>
                                        </div>
                                        <!--// util menu -->

                        </div>
                    </div>
                    <!--// Header -->

                    <!-- 전체메뉴 팝업 - Legacy Removed
                    <div class="all_menu" id="">
                       ...
                    </div>
                    -->
                    <!--// 전체메뉴 팝업 -->

                    <!-- Topmenu start -->
                    <script type="text/javascript">
                        <!-
                            function getLastLink(baseMenuNo) {
                                var tNode = new Array;
                                for (var i = 0; i < document.menuListForm.tmp_menuNm.length; i++) {
                                    tNode[i] = document.menuListForm.tmp_menuNm[i].value;
                                    var nValue = tNode[i].split("|");
                                    //선택된 메뉴(baseMenuNo)의 하위 메뉴중 첫번재 메뉴의 링크정보를 리턴한다.
                                    if (nValue[1] == baseMenuNo) {
                                        if (nValue[5] != "dir" && nValue[5] != "" && nValue[5] != "/" && nValue[5] != "#") {
                                            //링크정보가 있으면 링크정보를 리턴한다.
                                            return nValue[5];
                                        } else {
                                            //링크정보가 없으면 하위 메뉴중 첫번째 메뉴의 링크정보를 리턴한다.
                                            return getLastLink(nValue[0]);
                                        }
                                    }
                                }
                            }
                        function goMenuPage(baseMenuNo) {
                            event.preventDefault();
                            document.getElementById("baseMenuNo").value = baseMenuNo;
                            var rawLink = getLastLink(baseMenuNo);
                            if (!rawLink || rawLink === "dir") return;

                            var contextPath = '<c:url value="/" />';
                            var link = rawLink;

                            if (link.indexOf('/') === 0) {
                                // If link starts with /, and contextPath is /, then link is fine.
                                // If contextPath is /app/, then link should be /app/ + link.substring(1)
                                if (contextPath.length > 1) {
                                    link = contextPath + link.substring(1);
                                }
                            } else {
                                link = contextPath + link;
                            }

                            if (link.indexOf('?') === -1) {
                                link = link + '?';
                            } else {
                                link = link + '&';
                            }
                            link = link + 'baseMenuNo=' + baseMenuNo;
                            location.href = link;
                        }
                        function actionLogout() {
                            document.selectOne.action = "<c:url value='/uat/uia/actionLogout.do'/>";
                            document.selectOne.submit();
                            //document.location.href = "<c:url value='/j_spring_security_logout'/>";
                        }
                        //-->
                    </script>
                    <!-- // Topmenu end -->

                    <!-- Menu list -->
                    <form name="menuListForm" action="" method="post">
                        <input type="hidden" id="testData" value="꽥" />
                        <input type="hidden" id="baseMenuNo" name="baseMenuNo"
                            value="<c:out value='${sessionScope.baseMenuNo}'/>" />
                        <input type="hidden" id="link" name="link" value="" />
                        <div style="width:0px; height:0px;">
                            <c:forEach var="result" items="${list_menulist}" varStatus="status">
                                <input type="hidden" name="tmp_menuNm"
                                    value="<c:out value='${result.menuNo}'/>|<c:out value='${result.upperMenuId}'/>|<c:out value='${result.menuNm}'/>|<c:out value='${result.relateImagePath}'/>|<c:out value='${result.relateImageNm}'/>|<c:out value='${result.chkURL}'/>|" />
                            </c:forEach>
                        </div>
                    </form>