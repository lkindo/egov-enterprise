<%
/**
 * @Class Name : EgovWikMnthngReprtList.jsp
 * @Description : Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† Î™©Î°ùÏ°∞Ìöå
 * @Modification Information
 * @
 * @  ?òÏ†ï??     ?òÏ†ï??           ?òÏ†ï?¥Ïö©
 * @ -------        --------    ---------------------------
 * @ 2010.07.19  ?•Ï≤†??		ÏµúÏ¥à ?ùÏÑ±
 * @ 2018.09.27  ?¥Ï†ï?Ä			Í≥µÌÜµÏª¥Ìè¨?åÌä∏ 3.8 Í∞úÏÑ†
 * @ 2024.10.29  Í∂åÌÉú??		?îÎ≤ÑÍπÖÏö© console.log ?úÍ±∞(fn_egov_select_wikmnthngreprt())
 * @ 2024.10.29  Í∂åÌÉú??		reprtId ???¨Ìï®?òÍ≥† ?àÎäî form ?¥Î¶Ñ?ºÎ°ú Î≥ÄÍ≤?fn_egov_inqire_wikmnthngreprt())
 *
 *  @author Í≥µÌÜµÏª¥Ìè¨?åÌä∏Í∞úÎ∞ú?Ä ?•Ï≤†??
 *  @since 2010.07.19
 *  @version 1.0
 *  @see
 *
 */
%>
<%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<%@ taglib prefix="egovc" uri="/WEB-INF/tlds/egovc.tld" %>

<!DOCTYPE html>
<html lang="ko">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title><spring:message code="copSmtWmr.wikMnthngReprtList.wikMnthngReprtList"/></title><!-- Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† Î™©Î°ùÏ°∞Ìöå -->
<link href="<c:url value="/css/egovframework/com/com.css"/>" rel="stylesheet" type="text/css">
<link href="<c:url value="/css/egovframework/com/button.css"/>" rel="stylesheet" type="text/css">
<link href="<c:url value="/css/egovframework/com/cmm/jqueryui.css"/>" rel="stylesheet" type="text/css">
<script src="<c:url value='/js/egovframework/com/cmm/jquery.js' />"></script>
<script src="<c:url value='/js/egovframework/com/cmm/jqueryui.js' />"></script>
<script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/utl/EgovCmmUtl.js' />"></script>
<script type="text/javascript">

	function fn_egov_init_wikmnthngreprt(){
		if(document.frm.searchBgnDe.value != ""){
			document.frm.searchBgnDe.value = document.frm.searchBgnDe.value.substring(0,4) + "-" + document.frm.searchBgnDe.value.substring(4,6) + "-" + document.frm.searchBgnDe.value.substring(6,8);
		}

		if(document.frm.searchEndDe.value != ""){
			document.frm.searchEndDe.value = document.frm.searchEndDe.value.substring(0,4) + "-" + document.frm.searchEndDe.value.substring(4,6) + "-" + document.frm.searchEndDe.value.substring(6,8);
		}
	}

	function press(event) {
		if (event.keyCode==13) {
			fn_egov_select_linkPage('1');
		}
	}
	
	function fn_egov_select_linkPage(pageNo){
		document.frm.pageIndex.value = pageNo;
		document.frm.action = "<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>";
	   	document.frm.submit();
	}

	function fn_egov_select_wikmnthngreprt() {
		document.frm.pageIndex.value = "1";
		document.frm.action = "<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>";

		var bgnDe = document.frm.searchBgnDe.value.split("-").join("");
		var endDe = document.frm.searchEndDe.value.split("-").join("");

		if(bgnDe != ""){
			if(isDate(bgnDe, "<spring:message code="copSmtWmr.wikMnthngReprtList.searchBgnDe"/>") == false) {/* Í≤Ä?âÏãú?ëÏùº??*/
		        return;
		    }
		}

		if(endDe != ""){
		    if(isDate(endDe, "<spring:message code="copSmtWmr.wikMnthngReprtList.searchEndDe"/>") == false) {/* Í≤Ä?âÏ¢ÖÎ£åÏùº??*/
		        return;
		    }
		}

		if(bgnDe != "" && endDe != ""){
			if(eval(bgnDe) > eval(endDe)){
				alert("<spring:message code="copSmtWmr.wikMnthngReprtList.validate.searchDeAlert"/>");/* Í≤Ä?âÏ¢ÖÎ£åÏùº?êÍ? Í≤Ä?âÏãú?ëÏùº?êÎ≥¥??Îπ†Î????ÜÏäµ?àÎã§. */
				return;
			}
		}

		document.frm.submit();
	}

	function fn_egov_inqire_wikmnthngreprt(reprtId) {
		document.frm.reprtId.value = reprtId;
		document.frm.action = "<c:url value='/cop/smt/wmr/selectWikMnthngReprt.do'/>";
		document.frm.submit();
	}

	function fn_egov_insert_wikmnthngreprt(){
		document.frm.action = "<c:url value='/cop/smt/wmr/addWikMnthngReprt.do'/>";
		document.frm.submit();
	}
/* ********************************************************
 * ?¨Î†•
 ******************************************************** */
	function fn_egov_init_date(){

		$("#searchBgnDe").datepicker(  
		        {dateFormat:'yy-mm-dd'
		         , showOn: 'button'
		         , buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>'
		         , buttonImageOnly: true
		         
		         , showMonthAfterYear: true
		         , showOtherMonths: true
			     , selectOtherMonths: true
					
		         , changeMonth: true // ?îÏÑ†??select box ?úÏãú (Í∏∞Î≥∏?Ä false)
		         , changeYear: true  // ?ÑÏÑ†??selectbox ?úÏãú (Í∏∞Î≥∏?Ä false)
		         , showButtonPanel: true // ?òÎã® today, done  Î≤ÑÌäºÍ∏∞Îä• Ï∂îÍ? ?úÏãú (Í∏∞Î≥∏?Ä false)
		         
		});


		$("#searchEndDe").datepicker( 
		        {dateFormat:'yy-mm-dd'
		         , showOn: 'button'
		         , buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>'  
		         , buttonImageOnly: true
		         
		         , showMonthAfterYear: true
		         , showOtherMonths: true
			     , selectOtherMonths: true
					
		         , changeMonth: true // ?îÏÑ†??select box ?úÏãú (Í∏∞Î≥∏?Ä false)
		         , changeYear: true  // ?ÑÏÑ†??selectbox ?úÏãú (Í∏∞Î≥∏?Ä false)
		         , showButtonPanel: true // ?òÎã® today, done  Î≤ÑÌäºÍ∏∞Îä• Ï∂îÍ? ?úÏãú (Í∏∞Î≥∏?Ä false)
		});
	}
</script>

</head>
<body onLoad="fn_egov_init_wikmnthngreprt(); fn_egov_init_date()">

<noscript class="noScriptTitle"><spring:message code="common.noScriptTitle.msg" /></noscript><!-- ?êÎ∞î?§ÌÅ¨Î¶ΩÌä∏Î•?ÏßÄ?êÌïòÏßÄ ?äÎäî Î∏åÎùº?∞Ï??êÏÑú???ºÎ? Í∏∞Îä•???¨Ïö©?òÏã§ ???ÜÏäµ?àÎã§. -->

<div class="board">
<form name="frm" method="post" action="<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>">
	<h1><spring:message code="copSmtWmr.wikMnthngReprtList.wikMnthngReprtList"/></h1><!-- Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† Î™©Î°ù -->

	<div class="search_box" title="<spring:message code="common.searchCondition.msg" />"><!-- ???àÏù¥?ÑÏõÉ?Ä ?òÎã® ?ïÎ≥¥Î•??Ä??Í≤Ä???ïÎ≥¥Î°?Íµ¨ÏÑ±?òÏñ¥ ?àÏäµ?àÎã§. -->
		<ul style="text-align:left">
			<li>
				<select name="searchSttus" class="select" title="<spring:message code="input.cSelect"/>" style="margin-bottom:2px"><!-- ?†ÌÉù -->
					<option value="3"><spring:message code="copSmtWmr.wikMnthngReprtList.searchSttus"/></option><!-- ?πÏù∏?¨Î? -->
					<option value="0" <c:if test="${searchVO.searchSttus == '0'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.unapproved"/></option><!-- ÎØ∏Ïäπ??-->
					<option value="1" <c:if test="${searchVO.searchSttus == '1'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.approval"/></option><!-- ?πÏù∏ -->
			   </select>
			   
				<select name="searchDe" class="select" title="<spring:message code="input.cSelect"/>" style="width:90px"><!-- ?†ÌÉù -->
					<option value="3"><spring:message code="copSmtWmr.wikMnthngReprtList.searchDe"/></option>
					<option value="0" <c:if test="${searchVO.searchDe == '0'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.reprtDe"/></option><!-- Î≥¥Í≥†?ºÏûê -->
					<option value="1" <c:if test="${searchVO.searchDe == '1'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.reprtBgnEndDe"/></option><!-- ?¥Îãπ?ºÏûê -->
				</select>
				
				<input name="searchBgnDe" id="searchBgnDe" type="text" maxlength="10" value="<c:out value="${searchVO.searchBgnDe}"/>" title="<spring:message code="input.input"/>" style="width:79px" /><!-- ?ÖÎ†• -->
				~<input name="searchEndDe" id="searchEndDe" type="text" maxlength="10" value="<c:out value="${searchVO.searchEndDe}"/>" title="<spring:message code="input.input"/>" style="width:79px" /><!-- ?ÖÎ†• -->
				<br />
				
				<select name="searchSe" class="select" title="<spring:message code="input.cSelect"/>"><!-- ?†ÌÉù -->
					<option value="3"><spring:message code="copSmtWmr.wikMnthngReprtList.searchSe"/></option><!-- Î≥¥Í≥†?†Ìòï -->
					<option value="1" <c:if test="${searchVO.searchSe == '1'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.WeeklyReport"/></option><!-- Ï£ºÍ∞ÑÎ≥¥Í≥† -->
					<option value="2" <c:if test="${searchVO.searchSe == '2'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.MonthlyReport"/></option><!-- ?îÍ∞ÑÎ≥¥Í≥† -->
				</select>
				<select name="searchCnd" class="select" title="<spring:message code="input.cSelect"/>"><!-- ?†ÌÉù -->
					<option value="3"><spring:message code="copSmtWmr.wikMnthngReprtList.searchCnd"/></option><!-- ?úÎ™©/?ëÏÑ±??-->
					<option value="0" <c:if test="${searchVO.searchCnd == '0'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.reprtSj"/></option><!-- ?úÎ™© -->
					<option value="1" <c:if test="${searchVO.searchCnd == '1'}">selected="selected"</c:if> ><spring:message code="copSmtWmr.wikMnthngReprtList.wrterNm"/></option><!-- ?ëÏÑ±??-->
				</select>
				<input name="searchWrd" type="text" value="<c:out value="${searchVO.searchWrd}"/>" maxlength="35" onkeypress="press(event);" title="<spring:message code="title.search"/>" style="width:380px" /><!-- Í≤Ä?âÏñ¥  -->
				
				<input class="s_btn" type="submit" value="<spring:message code="button.inquire"/>" title="<spring:message code="button.inquire"/>" onclick="fn_egov_select_wikmnthngreprt(); return false;" /><!-- Ï°∞Ìöå -->
				<input class="s_btn" type="submit" value="<spring:message code="button.create"/>" title="<spring:message code="button.create"/>" onclick="fn_egov_insert_wikmnthngreprt(); return false;" /><!-- ?±Î°ù -->
			</li>
		</ul>
	</div>
	<input name="pageIndex" type="hidden" value="<c:out value='${searchVO.pageIndex}'/>">
</form>

	<table class="board_list">
		<caption></caption>
		<colgroup>
			<col style="width:10%" />
			<col style="width:10%" />
			<col style="width:10%" />
			<col style="width:30%" />
			<col style="width:20%" />
			<col style="width:10%" />
			<col style="width:10%" />
		</colgroup>
		<thead>
			<tr>
			   <th scope="col"><spring:message code="table.num"/></th><!-- Î≤àÌò∏ -->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.searchSe"/></th><!-- Î≥¥Í≥†?†Ìòï -->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.reprtDe"/></th><!-- Î≥¥Í≥†?ºÏûê -->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.reprtSuj"/></th><!-- Î≥¥Í≥†?úÏ†úÎ™?-->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.reprtBgnEndDe"/></th><!-- ?¥Îãπ?ºÏûê -->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.wrterNm"/></th><!-- ?ëÏÑ±??-->
			   <th scope="col"><spring:message code="copSmtWmr.wikMnthngReprtList.approval"/></th><!-- ?πÏù∏ -->
			</tr>
		</thead>
		<tbody>
			<c:forEach var="result" items="${resultList}" varStatus="status">
			  <tr>
			    <td><c:out value="${(searchVO.pageIndex-1) * searchVO.pageSize + status.count}"/></td>
			    <td><c:out value="${result.reprtSe}"/></td>
			    <td><c:out value="${result.reprtDe}"/></td>
			    <td>
			     <form name="wikMnthngReprtVO" method="post" action="<c:url value='/cop/smt/wmr/selectWikMnthngReprt.do'/>">
			    	<input name="pageIndex" type="hidden" value="<c:out value='${searchVO.pageIndex}'/>">
			    	<input name="searchCnd" type="hidden" value="<c:out value='${searchVO.searchCnd}'/>">
			    	<input name="searchWrd" type="hidden" value="<c:out value='${searchVO.searchWrd}'/>">
			    	<input name="searchDe" type="hidden" value="<c:out value='${searchVO.searchDe}'/>">
			    	<input name="searchBgnDe" type="hidden" value="<c:out value='${searchVO.searchBgnDe}'/>">
			    	<input name="searchEndDe" type="hidden" value="<c:out value='${searchVO.searchEndDe}'/>">
			    	<input name="searchSttus" type="hidden" value="<c:out value='${searchVO.searchSttus}'/>">
					<input type="hidden" name="reprtId" value="<c:out value="${egovc:encryptId(result.reprtId)}"/>">
					<span class="link"><input type="submit" value="<c:out value="${result.reprtSj}"/>" style="text-align : left;"></span>
				 </form>
				</td>
				<td><c:out value="${result.reprtBgnDe}"/>~<c:out value="${result.reprtEndDe}"/></td>
				<td><c:out value="${result.wrterNm}"/></td>
			    <td><c:out value="${result.confmDt}"/></td>
			  </tr>
			 </c:forEach>
			 <c:if test="${fn:length(resultList) == 0}">
			  <tr>
			    <td colspan="7"><spring:message code="common.nodata.msg" /></td>
			  </tr>
			 </c:if>
		</tbody>
	</table>

	<!-- paging navigation -->
	<div class="pagination">
		<ul>
			<ui:pagination paginationInfo="${paginationInfo}" type="image" jsFunction="fn_egov_select_linkPage"/>
		</ul>
	</div>
	
</form>
</div>
</body>
</html>
