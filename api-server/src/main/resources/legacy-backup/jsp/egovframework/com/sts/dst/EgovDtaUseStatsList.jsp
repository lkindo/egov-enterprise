<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
    <%@ taglib prefix="c" uri="jakarta.tags.core" %>
        <%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui" %>
            <%@ taglib uri="jakarta.tags.functions" prefix="fn" %>
                <%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
                    <c:set var="pageTitle">
                        <spring:message code="comStsDst.dtaUseStats.title" />
                    </c:set>
                    <!DOCTYPE html>
                    <html lang="ko">

                    <head>
                        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                        <title>${pageTitle}</title>
                        <link href="<c:url value=" /css/egovframework/com/com.css" />" rel="stylesheet" type="text/css">
                        <link href="<c:url value=" /css/egovframework/com/button.css" />" rel="stylesheet"
                        type="text/css">
                        <link type="text/css" rel="stylesheet"
                            href="<c:url value='/css/egovframework/com/cmm/jqueryui.css' />">
                        <script src="<c:url value='/js/egovframework/com/cmm/jquery.js' />"></script>
                        <script src="<c:url value='/js/egovframework/com/cmm/jqueryui.js' />"></script>

                        <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
                        <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
                        <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
                        <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
                        <script src="<c:url value='/js/ui.js'/>"></script>

                        <script type="text/javaScript" language="javascript">
function fn_egov_init_date(){
	$("#pmTyFromDate").datepicker({
		dateFormat:'yy-mm-dd', showOn: 'button', buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>', buttonImageOnly: true, showMonthAfterYear: true, showOtherMonths: true, selectOtherMonths: true, changeMonth: true, changeYear: true, showButtonPanel: true
	});
	$("#pmTyToDate").datepicker({
		dateFormat:'yy-mm-dd', showOn: 'button', buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>', buttonImageOnly: true, showMonthAfterYear: true, showOtherMonths: true, selectOtherMonths: true, changeMonth: true, changeYear: true, showButtonPanel: true
	});
}

function initDate() {
    var fromDate = '<c:out value="${pmDtaUseStats.pmFromDate}"/>';
    var toDate = '<c:out value="${pmDtaUseStats.pmToDate}"/>';
    if(fromDate == '') fromDate = '<c:out value="${dtaUseStatsVO.pmFromDate}"/>';
    if(toDate == '') toDate = '<c:out value="${dtaUseStatsVO.pmToDate}"/>';

    if(document.listForm.pmTyFromDate.value == '') {
        if(fromDate != '') document.listForm.pmTyFromDate.value = fromDate.substring(0,4) + '-' + fromDate.substring(4,6) + '-' + fromDate.substring(6,8);
        if(toDate != '') document.listForm.pmTyToDate.value = toDate.substring(0,4) + '-' + toDate.substring(4,6) + '-' + toDate.substring(6,8);
    }
    fn_egov_init_date();
}

function fncSelectDtaUseStatsList(pageNo) {
	if(!checkDateTy()) return;
    document.listForm.pageIndex.value = pageNo;
    document.listForm.action = "<c:url value='/sts/dst/selectDtaUseStatsList.do'/>";
    document.listForm.submit();
}

function checkDateTy() {
	var fromDate = document.listForm.pmTyFromDate.value.replace(/-/gi,"");
	var toDate = document.listForm.pmTyToDate.value.replace(/-/gi,"");
	document.listForm.pmFromDate.value = fromDate;
	document.listForm.pmToDate.value = toDate;

    if(document.listForm.pmDateTy.value == '') {
        alert("기간구분을 선택하세요.");
        return false;
    } else if(fromDate > toDate) {
        alert("종료일자는 시작일자보다 이후날짜로 선택하세요.");
        return false;
    }
    return true;
}
</script>
                    </head>

                    <body onLoad="javascript:initDate();">
                        <div class="wrap">
                            <c:import url="/sym/mms/EgovHeader.do" />
                            <div class="container" style="padding-bottom: 60px;">
                                <div class="sub_layout">
                                    <div class="sub_in">
                                        <div class="layout">
                                            <div class="board">
                                                <h1>${pageTitle}</h1>

                                                <form name="listForm"
                                                    action="<c:url value='/sts/dst/selectDtaUseStatsList.do'/>"
                                                    method="post">
                                                    <div class="search_box">
                                                        <input type="hidden" name="pmFromDate" value="<c:out value="
                                                            ${dtaUseStatsVO.pmFromDate}" />" >
                                                        <input type="hidden" name="pmToDate" value="<c:out value="
                                                            ${dtaUseStatsVO.pmToDate}" />" >
                                                        <input type="hidden" name="pageIndex"
                                                            value="<c:out value='${dtaUseStatsVO.pageIndex}'/>">
                                                        <ul>
                                                            <li>
                                                                <label>
                                                                    <spring:message
                                                                        code="comStsDst.dtaUseStats.boardName" /> :
                                                                </label>
                                                                <input type="text" name="searchKeyword" size="10"
                                                                    value="<c:out value="
                                                                    ${dtaUseStatsVO.searchKeyword}" />" >

                                                                <label style="margin-left:10px">
                                                                    <spring:message
                                                                        code="comStsDst.dtaUseStats.periodKind" /> :
                                                                </label>
                                                                <select name="pmDateTy">
                                                                    <option value="">
                                                                        <spring:message
                                                                            code="comStsDst.dtaUseStats.select" />
                                                                    </option>
                                                                    <c:forEach var="cmmCode042"
                                                                        items="${cmmCode042List}">
                                                                        <option value="<c:out value="
                                                                            ${cmmCode042.code}" />" <c:if
                                                                            test="${cmmCode042.code == dtaUseStatsVO.pmDateTy}">
                                                                            selected</c:if> >
                                                                        <c:out value="${cmmCode042.codeNm}" />
                                                                        </option>
                                                                    </c:forEach>
                                                                </select>

                                                                <label style="margin-left:10px">
                                                                    <spring:message
                                                                        code="comStsDst.dtaUseStats.period" /> :
                                                                </label>
                                                                <input type="text" name="pmTyFromDate" size="10"
                                                                    id="pmTyFromDate" value="" />
                                                                <input type="text" name="pmTyToDate" size="10"
                                                                    id="pmTyToDate" value="" />

                                                                <input class="s_btn" type="submit"
                                                                    value="<spring:message code=" button.inquire" />"
                                                                onclick="fncSelectDtaUseStatsList('1'); return false;"
                                                                />
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </form>

                                                <table class="board_list">
                                                    <caption>
                                                        <spring:message code="title.list" />
                                                    </caption>
                                                    <colgroup>
                                                        <col style="width:25%" />
                                                        <col style="width:10%" />
                                                        <col style="width:25%" />
                                                        <col style="width:25%" />
                                                        <col style="width:15%" />
                                                    </colgroup>
                                                    <thead>
                                                        <tr>
                                                            <th scope="col">
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.col1" />
                                                            </th>
                                                            <th scope="col">
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.col2" />
                                                            </th>
                                                            <th scope="col">
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.col3" />
                                                            </th>
                                                            <th scope="col">
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.col4" />
                                                            </th>
                                                            <th scope="col">
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.col5" />
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <c:if test="${fn:length(dtaUseStatsList) == 0}">
                                                            <tr>
                                                                <td colspan="5">
                                                                    <spring:message code="common.nodata.msg" />
                                                                </td>
                                                            </tr>
                                                        </c:if>
                                                        <c:forEach var="item" items="${dtaUseStatsList}">
                                                            <tr>
                                                                <td>
                                                                    <c:out value="${item.bbsNm}" />
                                                                </td>
                                                                <td>
                                                                    <c:out value="${item.nttId}" />
                                                                </td>
                                                                <td>
                                                                    <c:out value="${item.nttSj}" />
                                                                </td>
                                                                <td>
                                                                    <c:out value="${item.fileNm}" />
                                                                </td>
                                                                <td>
                                                                    <c:out value="${item.downCnt}" />
                                                                </td>
                                                            </tr>
                                                        </c:forEach>
                                                    </tbody>
                                                </table>

                                                <!-- Pagination -->
                                                <div class="pagination">
                                                    <ui:pagination paginationInfo="${paginationInfo}" type="image"
                                                        jsFunction="fncSelectDtaUseStatsList" />
                                                </div>

                                                <h2 class="tit02" style="margin:20px 0 10px 0">
                                                    <spring:message code="comStsDst.dtaUseStats.subTitle1" />
                                                </h2>
                                                <table class="e001">
                                                    <c:forEach var="bar" items="${dtaUseStatsBarList}">
                                                        <tr>
                                                            <td class="lt_text3" width="15%">
                                                                <c:out value="${bar.grpRegDate}" />
                                                            </td>
                                                            <td width="85%"><img
                                                                    src="<c:url value='/images/egovframework/com/cmm/left_bg.gif'/>"
                                                                    width="<c:out value='${bar.grpCnt * dtaUseStatsVO.maxUnit}'/>"
                                                                    height="10" align="left" alt="">&nbsp;&nbsp;
                                                                <c:out value="${bar.grpCnt}" />
                                                                <spring:message
                                                                    code="comStsDst.dtaUseStats.results.unit" />
                                                            </td>
                                                        </tr>
                                                    </c:forEach>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <c:import url="/sym/mms/EgovFooter.do" />
                        </div>
                    </body>

                    </html>