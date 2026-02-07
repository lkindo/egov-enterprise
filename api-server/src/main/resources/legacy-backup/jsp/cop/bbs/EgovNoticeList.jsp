<%-- 공지사항 목록 화면 (JPA 기반으로 리팩토링) - 문제가 되는 의존성 제거 - 헤더/푸터 인라인 통합 - 기존 CSS/디자인 유지 --%>
    <%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
        <%@ taglib prefix="c" uri="jakarta.tags.core" %>
            <%@ taglib prefix="fn" uri="jakarta.tags.functions" %>

                <!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>내부업무 사이트 > 알림정보 >
                        <c:out value="${brdMstrVO.bbsNm}" default="공지사항" />
                    </title>

                    <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
                    <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
                    <script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
                    <script src="<c:url value='/js/ui.js'/>"></script>

                    <script type="text/javascript">
                        function press(event) {
                            if (event.keyCode == 13) {
                                fn_egov_select_noticeList('1');
                            }
                        }

                        function fn_egov_addNotice() {
                            document.frm.action = "<c:url value='/cop/bbs/addBoardArticle.do'/>";
                            document.frm.submit();
                        }

                        function fn_egov_select_noticeList(pageNo) {
                            document.frm.pageIndex.value = pageNo;
                            document.frm.action = "<c:url value='/cop/bbs/selectBoardList.do'/>";
                            document.frm.submit();
                        }

                        function fn_egov_inqire_notice(nttId, bbsId) {
                            document.subForm.nttId.value = nttId;
                            document.subForm.bbsId.value = bbsId;
                            document.subForm.action = "<c:url value='/cop/bbs/selectBoardArticle.do'/>";
                            document.subForm.submit();
                        }
                    </script>
                </head>

                <body>
                    <noscript>자바스크립트를 지원하지 않는 브라우저에서는 일부 기능을 사용하실 수 없습니다.</noscript>

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
                                <!-- //gnb -->

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

                        <div class="container">
                            <div class="sub_layout">
                                <div class="sub_in">
                                    <div class="layout">
                                        <!-- Left menu (사이드바) -->
                                        <div class="nav">
                                            <div class="inner">
                                                <c:forEach var="root" items="${menuList}">
                                                    <c:if test="${root.id == activeRootMenuId}">
                                                        <h2>
                                                            <c:out value="${root.menuNm}" />
                                                        </h2>
                                                    </c:if>
                                                </c:forEach>
                                                <ul>
                                                    <c:forEach var="sub" items="${subMenu}">
                                                        <li>
                                                            <c:set var="subUrl" value="#" />
                                                            <c:choose>
                                                                <c:when test="${sub.id == 1010000}">
                                                                    <c:set var="subUrl"
                                                                        value="/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA" />
                                                                </c:when>
                                                                <c:when test="${sub.id == 1020000}">
                                                                    <c:set var="subUrl"
                                                                        value="/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC" />
                                                                </c:when>
                                                            </c:choose>
                                                            <a href="<c:url value='${subUrl}'/>"
                                                                class="${(boardVO.bbsId == 'BBSMSTR_AAAAAAAAAAAA' && sub.id == 1010000) || (boardVO.bbsId == 'BBSMSTR_CCCCCCCCCCCC' && sub.id == 1020000) ? 'cur' : ''}">
                                                                <c:out value="${sub.menuNm}" />
                                                            </a>
                                                        </li>
                                                    </c:forEach>
                                                </ul>
                                            </div>
                                        </div>
                                        <!-- //Left menu -->

                                        <div class="content_wrap">
                                            <div id="contents" class="content">

                                                <!-- Location -->
                                                <div class="location">
                                                    <ul>
                                                        <li><a class="home" href="<c:url value='/'/>">Home</a></li>
                                                        <li><a href="">알림정보</a></li>
                                                        <li>
                                                            <c:out value="${brdMstrVO.bbsNm}" default="공지사항" />
                                                        </li>
                                                    </ul>
                                                </div>
                                                <!-- //Location -->

                                                <h1 class="tit_1">알림정보</h1>
                                                <h2 class="tit_2">
                                                    <c:out value="${brdMstrVO.bbsNm}" default="공지사항" />
                                                </h2>

                                                <!-- 검색조건 -->
                                                <div class="condition">
                                                    <form name="frm"
                                                        action="<c:url value='/cop/bbs/selectBoardList.do'/>"
                                                        method="get">
                                                        <input type="hidden" name="bbsId"
                                                            value="<c:out value='${boardVO.bbsId}'/>" />
                                                        <input type="hidden" name="nttId" value="0" />
                                                        <input type="hidden" name="bbsTyCode"
                                                            value="<c:out value='${brdMstrVO.bbsTyCode}'/>" />
                                                        <input type="hidden" name="bbsAttrbCode"
                                                            value="<c:out value='${brdMstrVO.bbsAttrbCode}'/>" />
                                                        <input type="hidden" name="authFlag"
                                                            value="<c:out value='${brdMstrVO.authFlag}'/>" />
                                                        <input name="pageIndex" type="hidden"
                                                            value="<c:out value='${searchVO.pageIndex}' default='1'/>" />

                                                        <label class="item f_select" for="searchCnd">
                                                            <select name="searchCnd" id="searchCnd" title="검색조건 선택">
                                                                <option value="0" <c:if
                                                                    test="${searchVO.searchCnd == '0'}">
                                                                    selected="selected"</c:if>>제목</option>
                                                                <option value="1" <c:if
                                                                    test="${searchVO.searchCnd == '1'}">
                                                                    selected="selected"</c:if>>내용</option>
                                                                <option value="2" <c:if
                                                                    test="${searchVO.searchCnd == '2'}">
                                                                    selected="selected"</c:if>>작성자</option>
                                                            </select>
                                                        </label>

                                                        <span class="item f_search">
                                                            <input class="f_input w_500" name="searchWrd" type="text"
                                                                value='<c:out value="${searchVO.searchWrd}"/>'
                                                                maxlength="35" onkeypress="press(event);"
                                                                title="검색어 입력">
                                                            <button class="btn" type="submit"
                                                                onclick="fn_egov_select_noticeList('1'); return false;">조회</button>
                                                        </span>

                                                        <a href="<c:url value='/cop/bbs/addBoardArticle.do'/>?bbsId=<c:out value='${boardVO.bbsId}'/>"
                                                            class="item btn btn_blue_46 w_100">등록</a>
                                                    </form>
                                                </div>
                                                <!-- //검색조건 -->

                                                <!-- 게시판 -->
                                                <div class="board_list">
                                                    <table summary="번호, 제목, 작성자, 작성일, 조회수 입니다">
                                                        <caption>게시물 목록</caption>
                                                        <colgroup>
                                                            <col style="width: 80px;">
                                                            <col style="width: auto;">
                                                            <col style="width: 100px;">
                                                            <col style="width: 120px;">
                                                            <col style="width: 100px;">
                                                        </colgroup>
                                                        <thead>
                                                            <tr>
                                                                <th scope="col">번호</th>
                                                                <th scope="col">제목</th>
                                                                <th scope="col">작성자</th>
                                                                <th scope="col">작성일</th>
                                                                <th scope="col">조회수</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <c:choose>
                                                                <c:when test="${fn:length(resultList) == 0}">
                                                                    <tr>
                                                                        <td colspan="5">데이터가 없습니다.</td>
                                                                    </tr>
                                                                </c:when>
                                                                <c:otherwise>
                                                                    <c:forEach var="result" items="${resultList}"
                                                                        varStatus="status">
                                                                        <tr>
                                                                            <td>
                                                                                <c:out
                                                                                    value="${resultCnt - status.index}" />
                                                                            </td>
                                                                            <td class="al">
                                                                                <form name="subForm${status.index}"
                                                                                    method="get"
                                                                                    action="<c:url value='/cop/bbs/selectBoardArticle.do'/>">
                                                                                    <input type="hidden" name="bbsId"
                                                                                        value="<c:out value='${result.bbsId}'/>" />
                                                                                    <input type="hidden" name="nttId"
                                                                                        value="<c:out value='${result.nttId}'/>" />
                                                                                    <input type="hidden"
                                                                                        name="bbsTyCode"
                                                                                        value="<c:out value='${brdMstrVO.bbsTyCode}'/>" />
                                                                                    <input type="hidden"
                                                                                        name="bbsAttrbCode"
                                                                                        value="<c:out value='${brdMstrVO.bbsAttrbCode}'/>" />
                                                                                    <input type="hidden" name="authFlag"
                                                                                        value="<c:out value='${brdMstrVO.authFlag}'/>" />

                                                                                    <a href="#" class="lnk"
                                                                                        onclick="event.preventDefault(); document.forms['subForm${status.index}'].submit();">
                                                                                        <c:out
                                                                                            value="${result.nttSj}" />
                                                                                    </a>
                                                                                </form>
                                                                            </td>
                                                                            <td>
                                                                                <c:out
                                                                                    value="${result.frstRegisterNm}" />
                                                                            </td>
                                                                            <td>
                                                                                <c:out
                                                                                    value="${result.frstRegisterPnttm}" />
                                                                            </td>
                                                                            <td>
                                                                                <c:out value="${result.inqireCo}" />
                                                                            </td>
                                                                        </tr>
                                                                    </c:forEach>
                                                                </c:otherwise>
                                                            </c:choose>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <!-- 페이지 네비게이션 -->
                                                <div class="board_list_bot">
                                                    <div class="paging" id="paging_div">
                                                        <ul>
                                                            <c:if test="${paginationInfo != null}">
                                                                <c:if test="${paginationInfo.currentPageNo > 1}">
                                                                    <li><a href="#"
                                                                            onclick="fn_egov_select_noticeList('1'); return false;">처음</a>
                                                                    </li>
                                                                    <li><a href="#"
                                                                            onclick="fn_egov_select_noticeList('${paginationInfo.currentPageNo - 1}'); return false;">이전</a>
                                                                    </li>
                                                                </c:if>

                                                                <c:forEach var="pageNum"
                                                                    begin="${paginationInfo.firstPageNoOnPageList}"
                                                                    end="${paginationInfo.lastPageNoOnPageList}">
                                                                    <c:choose>
                                                                        <c:when
                                                                            test="${pageNum == paginationInfo.currentPageNo}">
                                                                            <li class="on"><strong>${pageNum}</strong>
                                                                            </li>
                                                                        </c:when>
                                                                        <c:otherwise>
                                                                            <li><a href="#"
                                                                                    onclick="fn_egov_select_noticeList('${pageNum}'); return false;">${pageNum}</a>
                                                                            </li>
                                                                        </c:otherwise>
                                                                    </c:choose>
                                                                </c:forEach>

                                                                <c:if
                                                                    test="${paginationInfo.currentPageNo < paginationInfo.totalPageCount}">
                                                                    <li><a href="#"
                                                                            onclick="fn_egov_select_noticeList('${paginationInfo.currentPageNo + 1}'); return false;">다음</a>
                                                                    </li>
                                                                    <li><a href="#"
                                                                            onclick="fn_egov_select_noticeList('${paginationInfo.totalPageCount}'); return false;">끝</a>
                                                                    </li>
                                                                </c:if>
                                                            </c:if>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <!-- //페이지 네비게이션 -->

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

                    <!-- 상세 조회용 hidden form -->
                    <form name="subForm" method="get" action="<c:url value='/cop/bbs/selectBoardArticle.do'/>">
                        <input type="hidden" name="bbsId" value="" />
                        <input type="hidden" name="nttId" value="" />
                        <input type="hidden" name="bbsTyCode" value="" />
                        <input type="hidden" name="bbsAttrbCode" value="" />
                        <input type="hidden" name="authFlag" value="" />
                    </form>

                </body>

                </html>