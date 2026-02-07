<%@ page contentType="text/html; charset=utf-8" %>
    <%@ taglib prefix="c" uri="jakarta.tags.core" %>
        <%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui" %>
            <%@ taglib uri="jakarta.tags.functions" prefix="fn" %>
                <%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
                    <c:set var="pageTitle">요청통계</c:set>
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
                        <script type="text/javascript"
                            src="<c:url value='/js/egovframework/com/sym/cal/EgovCalPopup.js' />"></script>
                        <script src="<c:url value='/js/egovframework/com/cmm/jquery.js' />"></script>
                        <script src="<c:url value='/js/egovframework/com/cmm/jqueryui.js' />"></script>
                        <script type="text/javaScript" language="javascript">
function fn_egov_init_date(){
	$("#fDate").datepicker(  
	        {dateFormat:'yy-mm-dd', showOn: 'button', buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>', buttonImageOnly: true, showMonthAfterYear: true, showOtherMonths: true, selectOtherMonths: true, changeMonth: true, changeYear: true, showButtonPanel: true});
	$("#tDate").datepicker( 
	        {dateFormat:'yy-mm-dd', showOn: 'button', buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>', buttonImageOnly: true, showMonthAfterYear: true, showOtherMonths: true, selectOtherMonths: true, changeMonth: true, changeYear: true, showButtonPanel: true});
}

function fnSearch(){
	var fromDate = document.listForm.fDate.value.replace(/-/gi,"");
	var toDate = document.listForm.tDate.value.replace(/-/gi,"");
	document.listForm.fromDate.value = fromDate;
	document.listForm.toDate.value = toDate;
	document.listForm.action = "<c:url value='/sts/rst/selectReqStats.do'/>";
   	document.listForm.submit();
}

function fnInitAll(){
	if (document.listForm.fDate.value == "" && document.listForm.tDate.value == "") {
		var now = new Date();
	    var year= now.getFullYear();
	    var mon = (now.getMonth()+1)>9 ? ''+(now.getMonth()+1) : '0'+(now.getMonth()+1);
	    var day = now.getDate()>9 ? ''+now.getDate() : '0'+now.getDate();
		var toDay = year + "-" + mon + "-" + day;
		document.listForm.fDate.value = toDay;
		document.listForm.tDate.value = toDay;
	}
	fn_egov_init_date();
}
</script>
                    </head>

                    <body onLoad="javascript:fnInitAll();">
                        <div class="wrap">
                            <c:import url="/sym/mms/EgovHeader.do" />
                            <div class="container" style="padding-bottom: 60px;">
                                <div class="sub_layout">
                                    <div class="sub_in">
                                        <div class="layout">
                                            <div class="board">
                                                <h1>${pageTitle}</h1>
                                                <form name="listForm"
                                                    action="<c:url value='/sts/rst/selectReqStats.do'/>" method="post">
                                                    <div class="search_box mb10">
                                                        <ul>
                                                            <li>
                                                                <label for="">기간 : </label>
                                                                <input type="hidden" name="fromDate"
                                                                    value="<c:out value=" ${statsVO.fromDate}" />" />
                                                                <input type="hidden" name="toDate" value="<c:out value="
                                                                    ${statsVO.toDate}" />" />
                                                                <input type="text" name="fDate" size="10" id="fDate"
                                                                    value="<c:out value=" ${statsVO.fromDate}" />"/>
                                                                <input type="text" name="tDate" size="10" tabindex="2"
                                                                    id="tDate" value="<c:out value="
                                                                    ${statsVO.toDate}" />"/>
                                                                <input class="s_btn" type="submit"
                                                                    value="<spring:message code=" button.search" />"
                                                                onclick="fnSearch(); return false;" />
                                                            </li>
                                                        </ul>
                                                    </div>

                                                    <h2 class="tit02" style="margin:0 0 10px 0">요청 통계 결과</h2>
                                                    <table class="e001 mb10">
                                                        <colgroup>
                                                            <col style="width:14%" />
                                                            <col style="" />
                                                        </colgroup>
                                                        <c:forEach items="${resultList}" var="resultInfo"
                                                            varStatus="status">
                                                            <tr>
                                                                <td width="10%" height="10" class="lt_text3" nowrap>
                                                                    ${resultInfo.statsDate}</td>
                                                                <td width="90%" height="10">
                                                                    <img src="<c:url value='/images/egovframework/com/cmm/left_bg.gif'/>"
                                                                        width="<c:out value='${resultInfo.statsCo * statsVO.maxUnit}'/>"
                                                                        height="10" align="left"
                                                                        alt="">&nbsp;&nbsp;${resultInfo.statsCo}&nbsp;건
                                                                </td>
                                                            </tr>
                                                        </c:forEach>
                                                        <c:if test="${fn:length(resultList) == 0}">
                                                            <tr>
                                                                <td>데이터가 없습니다.</td>
                                                            </tr>
                                                        </c:if>
                                                    </table>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <c:import url="/sym/mms/EgovFooter.do" />
                        </div>
                    </body>

                    </html>