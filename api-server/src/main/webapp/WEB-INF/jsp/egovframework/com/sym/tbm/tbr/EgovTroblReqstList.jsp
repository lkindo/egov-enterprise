<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<%
 /**
  * @Class Name : EgovTroblReqstList.jsp
  * @Description : 장애신청 목록조회
  * @Modification Information
  * @
  * @  수정일             수정자                   수정내용
  * @ -------    --------    ---------------------------
  * @ 2010.07.01   lee.m.j              최초 생성
  * @ 2026.01.06   Antigravity          레이아웃 및 UI 표준화 적용
  *
  *  @author lee.m.j
  *  @since 2010.07.01
  *  @version 1.0
  *  @see
  *
  */
%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><spring:message code="comSymTbmTbr.troblReqstList.title" /></title><!-- 장애신청 목록조회 -->
<link type="text/css" rel="stylesheet" href="<c:url value='/css/egovframework/com/com.css' />">
<script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
<script src="<c:url value='/js/ui.js'/>"></script>

<script type="text/javaScript" language="javascript" defer="defer">
<!--

function fncSelectTroblReqstList(pageNo){
    document.listForm.pageIndex.value = pageNo;
    document.listForm.action = "<c:url value='/sym/tbm/tbr/selectTroblReqstList.do'/>";
    document.listForm.submit();
}

function fncSelectTroblReqst(troblId) {
    document.listForm.troblId.value = troblId;
    document.listForm.action = "<c:url value='/sym/tbm/tbr/getTroblReqst.do'/>";
    document.listForm.submit();   
}

function fncAddTroblReqstInsert() {
	if(document.listForm.pageIndex.value == "") {
		document.listForm.pageIndex.value = 1;
	} 
    document.listForm.action = "<c:url value='/sym/tbm/tbr/addViewTroblReqst.do'/>";
    document.listForm.submit(); 
}

function linkPage(pageNo){
    document.listForm.pageIndex.value = pageNo;
    document.listForm.action = "<c:url value='/sym/tbm/tbr/selectTroblReqstList.do'/>";
    document.listForm.submit();
}

function press() {
    if (event.keyCode==13) {
    	fncSelectTroblReqstList('1');
    }
}
-->
</script>
<style>
    /* 레이아웃 보정을 위한 최소한의 스타일 (com.css에 레이아웃 클래스가 없을 경우 대비) */
    #layout_container { width: 1000px; margin: 0 auto; overflow: hidden; }
    #left_menu_area { float: left; width: 220px; }
    #content_area { float: left; width: 730px; padding-left: 20px; }
</style>
</head>

<body>
<noscript class="noScriptTitle"><spring:message code="common.noScriptTitle.msg" /></noscript>

<div id="wrapper">
    <!-- Header -->
    <c:import url="/sym/mms/EgovHeader.do" />
    <!--// Header -->

    <div id="layout_container">
        <!-- Left menu -->
        <div id="left_menu_area">
            <c:import url="/sym/mms/EgovMenuLeft.do" />
        </div>
        <!--// Left menu -->

        <div id="content_area">
            <form name="listForm" action="<c:url value='/sym/tbm/tbr/selectTroblReqstList.do'/>" method="post">
            
            <div class="board">
                <h1><spring:message code="comSymTbmTbr.troblReqstList.pageTop.title" /></h1><!-- 장애신청 관리 -->

                <!-- 검색영역 -->
                <div class="search_box" title="<spring:message code="common.searchCondition.msg" />">
                    <ul>
                        <li>
                            <span class="lb mr10"><spring:message code="comSymTbmTbr.troblReqstList.troblNm" />:</span><!-- 장애명 -->
                            <input class="s_input" name="strTroblNm" type="text" value="<c:out value="${troblReqstVO.strTroblNm}"/>" onkeypress="press();" title="<spring:message code="comSymTbmTbr.troblReqstList.troblNm" />" />
                        </li>
                        <li>
                            <span class="lb ml10 mr10"><spring:message code="comSymTbmTbr.troblReqstList.troblKndNm" />:</span><!-- 장애종류 -->
                            <select name="strTroblKnd" class="select" title="<spring:message code="comSymTbmTbr.troblReqstList.troblKndNm" />">
                                <option value="00"><spring:message code="comSymTbmTbr.troblReqstList.selectAll" /></option>
                                <c:forEach var="cmmCodeDetail1" items="${cmmCodeDetailList1}" varStatus="status">
                                    <option value="<c:out value="${cmmCodeDetail1.code}"/>" <c:if test="${cmmCodeDetail1.code == troblReqstVO.strTroblKnd}">selected</c:if>>
                                        <c:out value="${cmmCodeDetail1.codeNm}"/>
                                    </option>
                                </c:forEach>
                            </select>
                        </li>
                        <li>
                             <span class="lb ml10 mr10"><spring:message code="comSymTbmTbr.troblReqstList.processSttusNm" />:</span><!-- 처리상태 -->
                             <select name="strProcessSttus" class="select" title="<spring:message code="comSymTbmTbr.troblReqstList.processSttusNm" />">
                                <option value="00"><spring:message code="comSymTbmTbr.troblReqstList.selectAll" /></option>
                                <c:forEach var="cmmCodeDetail2" items="${cmmCodeDetailList2}" varStatus="status">
                                    <option value="<c:out value="${cmmCodeDetail2.code}"/>" <c:if test="${cmmCodeDetail2.code == troblReqstVO.strProcessSttus}">selected</c:if>>
                                        <c:out value="${cmmCodeDetail2.codeNm}"/>
                                    </option>
                                </c:forEach>
                            </select>
                        </li>
                        <li>
                            <input class="s_btn" type="submit" value="<spring:message code="button.inquire" />" title="<spring:message code="button.inquire" />" onclick="fncSelectTroblReqstList('1'); return false;" />
                            <span class="btn_b">
                                <a href="<c:url value='/sym/tbm/tbr/addViewTroblReqst.do'/>?pageIndex=<c:out value='${troblReqstVO.pageIndex}'/>&amp;strTroblNm=<c:out value="${troblReqstVO.strTroblNm}"/>" onclick="fncAddTroblReqstInsert(); return false;" title="<spring:message code="button.create" />"><spring:message code="button.create" /></a>
                            </span>
                        </li>
                    </ul>
                </div>

                <!-- 목록영역 -->
                <table class="board_list" summary="장애신청 목록으로 장애ID, 장애명, 장애종류, 발생시간, 등록자, 처리상태로 구성">
                    <caption>장애신청 목록</caption>
                    <colgroup>
                        <col style="width:24%" />
                        <col style="width:20%" />
                        <col style="width:18%" />
                        <col style="width:20%" />
                        <col style="width:8%" />
                        <col style="width:10%" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.troblId" /></th><!-- 장애ID -->
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.troblNm" /></th><!-- 장애명 -->
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.troblKndNm" /></th><!-- 장애종류 -->
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.troblOccrrncTime" /></th><!-- 장애발생시간 -->
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.troblRqesterNm" /></th><!-- 등록자 -->
                            <th scope="col"><spring:message code="comSymTbmTbr.troblReqstList.processSttusNm" /></th><!-- 처리상태 -->
                        </tr>
                    </thead>
                    <tbody>
                        <c:if test="${fn:length(troblReqstList) == 0}">
                            <tr>
                                <td colspan="6"><spring:message code="common.nodata.msg" /></td>
                            </tr>
                        </c:if>
                        <c:forEach var="troblReqst" items="${troblReqstList}" varStatus="status">
                            <tr>
                                <td>
                                    <a href="<c:url value='/sym/tbm/tbr/getTroblReqst.do'/>?troblId=<c:out value='${troblReqst.troblId}'/>" onclick="fncSelectTroblReqst('<c:out value="${troblReqst.troblId}"/>'); return false;">
                                        <c:out value="${troblReqst.troblId}"/>
                                    </a>
                                </td>
                                <td><c:out value="${troblReqst.troblNm}"/></td>
                                <td><c:out value="${troblReqst.troblKndNm}"/></td>
                                <td><c:out value="${troblReqst.troblOccrrncTime}"/></td>
                                <td><c:out value="${troblReqst.troblRqesterNm}"/></td>
                                <td><c:out value="${troblReqst.processSttusNm}"/></td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>

                <!-- paging navigation -->
                <div class="pagination">
                    <ul>
                        <ui:pagination paginationInfo="${paginationInfo}" type="image" jsFunction="linkPage" />
                    </ul>
                </div>
            </div>

            <input type="hidden" name="troblId">
            <input type="hidden" name="pageIndex" value="<c:if test="${empty troblReqstVO.pageIndex }">1</c:if><c:if test="${!empty troblReqstVO.pageIndex }"><c:out value='${troblReqstVO.pageIndex}'/></c:if>">
            </form>
        </div>
    </div>

    <!-- Footer -->
    <c:import url="/sym/mms/EgovFooter.do" />
    <!--// Footer -->
</div>

</body>
</html>