<% 
/**
 * @Class Name : EgovWikMnthngReprtDetail.jsp
 * @Description : Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† ?ÅÏÑ∏Î≥¥Í∏∞
 * @Modification Information
 * @
 * @  ?òÏ†ï??     ?òÏ†ï??           ?òÏ†ï?¥Ïö©
 * @ -------        --------    ---------------------------
 * @ 2010.07.21   ?•Ï≤†??         ÏµúÏ¥à ?ùÏÑ±
 * @ 2018.10.02   ?¥Ï†ï?Ä          Í≥µÌÜµÏª¥Ìè¨?åÌä∏ 3.8 Í∞úÏÑ†
 *
 *  @author Í≥µÌÜµÏª¥Ìè¨?åÌä∏Í∞úÎ∞ú?Ä ?•Ï≤†??
 *  @since 2010.07.21
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
<%@ taglib prefix="form" uri="http://www.springframework.org/tags/form" %>
<%@ taglib prefix="egovc" uri="/WEB-INF/tlds/egovc.tld" %>
<%pageContext.setAttribute("crlf", "\r\n"); %>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title><spring:message code="copSmtWmr.wikMnthngReprtDetail.wikMnthngReprtDetail"/></title><!-- Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† ?ÅÏÑ∏Î≥¥Í∏∞ -->
<link href="<c:url value="/css/egovframework/com/com.css"/>" rel="stylesheet" type="text/css">
<link href="<c:url value="/css/egovframework/com/button.css"/>" rel="stylesheet" type="text/css">
<script type="text/javascript" src="<c:url value='/js/egovframework/com/sym/cal/EgovCalPopup.js' />"></script>
<%-- <script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/fms/EgovMultiFile.js'/>" ></script> --%>
<script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/fms/EgovMultiFiles.js'/>" ></script>
<script type="text/javascript" src="<c:url value="/js/egovframework/com/cmm/EgovValidation.js" />"></script>
<script type="text/javascript">
	function fn_egov_init_WikMnthngReprt(){
		
	}

	function fn_egov_modify_wikmnthngreprt() {
		document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/modifyWikMnthngReprt.do'/>";
		document.wikMnthngReprtVO.submit();					
	}

	function fn_egov_delete_wikmnthngreprt(){
		if(confirm("<spring:message code="common.delete.msg"/>")){/* ??†ú ?òÏãúÍ≤†Ïäµ?àÍπå? */
			document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/deleteWikMnthngReprt.do'/>";
			document.wikMnthngReprtVO.submit();
		}
	}

	function fn_egov_confirm_wikmnthngreprt(){
		if(confirm("<spring:message code="common.acknowledgement.msg"/>")){/* ?πÏù∏ ?òÏãúÍ≤†Ïäµ?àÍπå? */
			document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/confirmWikMnthngReprt.do'/>";
			document.wikMnthngReprtVO.submit();
		}
	}

	/* ********************************************************
	 * Î™©Î°ù ?ºÎ°ú Í∞ÄÍ∏?
	 ******************************************************** */
	function fn_egov_list_wikmnthngreprt(){
		document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>";
		document.wikMnthngReprtVO.submit();	
	}	


	/* ********************************************************
	* ?ÑÏù¥?? ?ùÏóÖÏ∞ΩÏó¥Í∏?
	******************************************************** */
	function fn_egov_reportr_WikMnthngReprt(strTitle, frmUniqId, frmEmplNo, frmEmplyrNm, frmOrgnztNm){
		var arrParam = new Array(6);
		arrParam[0] = window;
		arrParam[1] = strTitle;
		arrParam[2] = frmUniqId;
		arrParam[3] = frmEmplNo;
		arrParam[4] = frmEmplyrNm;
		arrParam[5] = frmOrgnztNm;

	 	window.showModalDialog("<c:url value='/uss/ion/ism/selectSanctnerListPopup.do' />", arrParam,"dialogWidth=800px;dialogHeight=500px;resizable=yes;center=yes");
	}
</script>

</head>
<body onLoad="fn_egov_init_WikMnthngReprt()">

<noscript class="noScriptTitle"><spring:message code="common.noScriptTitle.msg" /></noscript><!-- ?êÎ∞î?§ÌÅ¨Î¶ΩÌä∏Î•?ÏßÄ?êÌïòÏßÄ ?äÎäî Î∏åÎùº?∞Ï??êÏÑú???ºÎ? Í∏∞Îä•???¨Ïö©?òÏã§ ???ÜÏäµ?àÎã§. -->

<form:form modelAttribute="wikMnthngReprtVO" name="wikMnthngReprtVO" method="post" action="${pageContext.request.contextPath}/cop/smt/wmr/modifyWikMnthngReprt.do">

<div class="wTableFrm">
	<!-- ?Ä?¥Ì? -->
	<h2><spring:message code="copSmtWmr.wikMnthngReprtDetail.wikMnthngReprtDetail"/></h2><!-- Ï£ºÍ∞Ñ/?îÍ∞ÑÎ≥¥Í≥† ?ÅÏÑ∏Î≥¥Í∏∞ -->

	<!-- ?±Î°ù??-->
	<table class="wTable">
		<colgroup>
			<col style="width:16%" />
			<col style="" />
		</colgroup>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtSeInfo"/> <span class="pilsu">*</span></th><!-- Î≥¥Í≥†?†Ìòï -->
			<td class="left">
			    <c:forEach items="${reprtSe}" var="reprtSeInfo" varStatus="status">
				<c:if test="${reprtSeInfo.code eq wikMnthngReprt.reprtSe}">	
				<c:out value="${reprtSeInfo.codeNm}" escapeXml="false" />
				</c:if>
				</c:forEach>&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtDe"/> <span class="pilsu">*</span></th><!-- Î≥¥Í≥†?ºÏûê -->
			<td class="left">
			    <c:out value="${wikMnthngReprt.reprtDe}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtBgnEndDe"/> <span class="pilsu">*</span></th><!-- ?¥Îãπ?ºÏûê -->
			<td class="left">
			    <c:out value="${wikMnthngReprt.reprtBgnDe}" escapeXml="false" />
				~
				<c:out value="${wikMnthngReprt.reprtEndDe}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.wrterNm"/> <span class="pilsu">*</span></th><!-- ?ëÏÑ±??-->
			<td class="left">
				<c:out value="${wikMnthngReprt.wrterClsfNm}" escapeXml="false" />
				<c:out value="${wikMnthngReprt.wrterNm}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reportrNm"/> <span class="pilsu">*</span></th><!-- Î≥¥Í≥†?Ä?ÅÏûê -->
			<td class="left">
			    <c:out value="${wikMnthngReprt.reportrClsfNm}" escapeXml="false" />
				<c:out value="${wikMnthngReprt.reportrNm}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtSuj"/> <span class="pilsu">*</span></th><!-- Î≥¥Í≥†?úÏ†úÎ™?-->
			<td class="left">
			    <c:out value="${wikMnthngReprt.reprtSj}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtThswikCn"/> <span class="pilsu">*</span></th><!-- Í∏àÏ£ºÎ≥¥Í≥†?¥Ïö© -->
			<td class="left">
			    <c:out value="${fn:replace(wikMnthngReprt.reprtThswikCn , crlf , '<br>')}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtLesseeCn"/> <span class="pilsu">*</span></th><!-- Ï∞®Ï£ºÎ≥¥Í≥†?¥Ïö© -->
			<td class="left">
			    <c:out value="${fn:replace(wikMnthngReprt.reprtLesseeCn , crlf , '<br>')}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.partclrMatter"/></th><!-- ?πÏù¥?¨Ìï≠ -->
			<td class="left">
			    <c:out value="${fn:replace(wikMnthngReprt.partclrMatter , crlf , '<br>')}" escapeXml="false" />&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.file"/></th><!-- ?åÏùºÏ≤®Î? -->
			<td class="left">
			    <c:import charEncoding="utf-8" url="/cmm/fms/selectFileInfs.do" > 
				<c:param name="param_atchFileId" value="${egovc:encrypt(wikMnthngReprt.atchFileId)}" /> 
				</c:import>&nbsp;
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtDetail.reprtSttus"/></th><!-- Î≥¥Í≥†???ÅÌÉú -->
			<td class="left">
			    <c:out value="${wikMnthngReprt.reprtSttus}" escapeXml="false" />&nbsp;
			</td>
		</tr>
	</table>

	<!-- ?òÎã® Î≤ÑÌäº -->
	<div class="btn">
		<c:if test="${fn:substring(wikMnthngReprt.reprtSttus,0,2) eq '?±Î°ù' && wikMnthngReprt.reportrId eq uniqId}">
		<span class="btn_s"><a href="<c:url value='/cop/smt/wmr/confirmWikMnthngReprt.do'/>?searchWrd=<c:out value='${wikMnthngReprtVO.searchWrd}'/>&amp;searchCnd=<c:out value='${wikMnthngReprtVO.searchCnd}'/>&amp;pageIndex=<c:out value='${wikMnthngReprtVO.pageIndex}'/>&amp;searchSttus=<c:out value='${wikMnthngReprtVO.searchSttus}'/>&amp;searchDe=<c:out value='${wikMnthngReprtVO.searchDe}'/>&amp;searchBgnDe=<c:out value='${wikMnthngReprtVO.searchBgnDe}'/>&amp;searchEndDe=<c:out value='${wikMnthngReprtVO.searchEndDe}'/>" onclick="fn_egov_confirm_wikmnthngreprt(); return false;"><spring:message code="button.acknowledgment" /></a></span><!-- ?πÏù∏ -->
		</c:if>
		
		<c:if test="${fn:substring(wikMnthngReprt.reprtSttus,0,2) eq '?±Î°ù' && wikMnthngReprt.wrterId eq uniqId}">	
		<input class="s_submit" type="submit" value='<spring:message code="button.update" />' onclick="fn_egov_modify_wikmnthngreprt(); return false;" /><!-- ?òÏ†ï -->
		<span class="btn_s"><a href="<c:url value='/cop/smt/wmr/deleteWikMnthngReprt.do'/>?reprtId=<c:out value='${egovc:encryptId(wikMnthngReprtVO.reprtId)}'/>" onclick="fn_egov_delete_wikmnthngreprt(); return false;"><spring:message code="button.delete" /></a></span>
		</c:if>
		
		<input class="s_submit" type="submit" value='<spring:message code="button.list" />' onclick="fn_egov_list_wikmnthngreprt(); return false;" /><!-- Î™©Î°ù -->
	</div>
	<div style="clear:both;"></div>
</div>

	<!--form:hidden path="reprtId" / -->
	<input type="hidden" name="reprtId" value="<c:out value='${egovc:encryptId(wikMnthngReprtVO.reprtId)}'/>" />
	
	<!-- Í≤Ä?âÏ°∞Í±??†Ï? -->
    <input type="hidden" name="searchWrd" value="<c:out value='${wikMnthngReprtVO.searchWrd}'/>" />
    <input type="hidden" name="searchCnd" value="<c:out value='${wikMnthngReprtVO.searchCnd}'/>" />
    <input type="hidden" name="pageIndex" value="<c:out value='${wikMnthngReprtVO.pageIndex}'/>" />
    <input type="hidden" name="searchSttus" value="<c:out value='${wikMnthngReprtVO.searchSttus}'/>" />
    <input type="hidden" name="searchDe" value="<c:out value='${wikMnthngReprtVO.searchDe}'/>" />
    <input type="hidden" name="searchBgnDe" value="<c:out value='${wikMnthngReprtVO.searchBgnDe}'/>" />
    <input type="hidden" name="searchEndDe" value="<c:out value='${wikMnthngReprtVO.searchEndDe}'/>" />
    <!-- Í≤Ä?âÏ°∞Í±??†Ï? -->
</form:form>

</body>
</html>
