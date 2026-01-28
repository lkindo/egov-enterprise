<%
/**
 * @Class Name : EgovWikMnthngReprtUpdt.jsp
 * @Description : ì£¼ê°„/?”ê°„ë³´ê³  ?˜ì •
 * @Modification Information
 * @
 * @  ?˜ì •??     ?˜ì •??           ?˜ì •?´ìš©
 * @ -------        --------    ---------------------------
 * @ 2010.07.21   ?¥ì² ??         ìµœì´ˆ ?ì„±
 * @ 2018.10.02   ?´ì •?€          ê³µí†µì»´í¬?ŒíŠ¸ 3.8 ê°œì„ 
 * @ 2019.12.06   ? ìš©??         KISA ë³´ì•ˆ?½ì  ì¡°ì¹˜ (?„í—˜???•ì‹ ?Œì¼ ?…ë¡œ??
 *
 *  @author ê³µí†µì»´í¬?ŒíŠ¸ê°œë°œ?€ ?¥ì² ??
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
<!DOCTYPE html>
<html lang="ko">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title><spring:message code="copSmtWmr.wikMnthngReprtUpdt.wikMnthngReprtUpdt"/></title><!-- ì£¼ê°„/?”ê°„ë³´ê³  ?˜ì • -->
<link href="<c:url value="/css/egovframework/com/com.css"/>" rel="stylesheet" type="text/css">
<link href="<c:url value="/css/egovframework/com/button.css"/>" rel="stylesheet" type="text/css">
<link href="<c:url value="/css/egovframework/com/cmm/jqueryui.css"/>" rel="stylesheet" type="text/css">
<%-- <script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/fms/EgovMultiFile.js'/>" ></script> --%>
<script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/fms/EgovMultiFiles.js'/>" ></script>
<script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/utl/EgovCmmUtl.js' />"></script>
<script type="text/javascript" src="<c:url value='/js/egovframework/com/cmm/showModalDialog.js' />"></script>
<script type="text/javascript" src="<c:url value="/js/egovframework/com/cmm/EgovValidation.js" />"></script>
<script src="<c:url value='/js/egovframework/com/cmm/jqueryui.js' />"></script>
<script type="text/javascript">
	function fn_egov_update_wikmnthngreprt() {
		if (!validateWikMnthngReprtVO(document.wikMnthngReprtVO)){
			return;
		}

		var bgnDe = document.wikMnthngReprtVO.reprtBgnDe.value.split("-").join("");
		var endDe = document.wikMnthngReprtVO.reprtEndDe.value.split("-").join("");

		if(bgnDe != ""){
			if(isDate(bgnDe, "<spring:message code="copSmtWmr.wikMnthngReprtUpdt.bgnDe"/>") == false) {/* ?´ë‹¹?œì‘?¼ì */
		        return;
		    }
		}

		if(endDe != ""){
		    if(isDate(endDe, "<spring:message code="copSmtWmr.wikMnthngReprtUpdt.endDe"/>") == false) {/* ?´ë‹¹ì¢…ë£Œ?¼ì */
		        return;
		    }
		}

		if(bgnDe != "" && endDe != ""){
			if(eval(bgnDe) > eval(endDe)){
				alert("<spring:message code="copSmtWmr.wikMnthngReprtUpdt.validate.searchDeAlert"/>");/* ?´ë‹¹ì¢…ë£Œ?¼ìê°€ ?´ë‹¹?œì‘?¼ìë³´ë‹¤ ë¹ ë????†ìŠµ?ˆë‹¤. */
				return;
			}
		}

		var resultExtension = EgovMultiFilesChecker.checkExtensions("egovComFileUploader", "<c:out value='${fileUploadExtensions}'/>"); // ê²°ê³¼ê°€ false?¸ê²½???ˆìš©?˜ì? ?ŠìŒ
		if (!resultExtension) return true;
		var resultSize = EgovMultiFilesChecker.checkFileSize("egovComFileUploader", <c:out value='${fileUploadMaxSize}'/>); // ?Œì¼??1Mê¹Œì? ?ˆìš© (1K=1024), ê²°ê³¼ê°€ false?¸ê²½???ˆìš©?˜ì? ?ŠìŒ
		if (!resultSize) return true;
		
		if (confirm('<spring:message code="common.regist.msg" />')) {
			document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/updateWikMnthngReprt.do'/>";
			document.wikMnthngReprtVO.submit();
		}
	}

/* ********************************************************
 * ëª©ë¡ ?¼ë¡œ ê°€ê¸?
 ******************************************************** */
	function fn_egov_list_wikmnthngreprt(){
		document.wikMnthngReprtVO.action = "<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>";
		document.wikMnthngReprtVO.submit();
	}


/* ********************************************************
* ?„ì´?? ?ì—…ì°½ì—´ê¸?
******************************************************** */
	function fn_egov_reportr_WikMnthngReprt(strTitle, frmUniqId, frmEmplNo, frmEmplyrNm, frmOrgnztNm){
		var arrParam = new Array(6);
		arrParam[0] = window;
		arrParam[1] = strTitle;
		arrParam[2] = frmUniqId;
		arrParam[3] = frmEmplNo;
		arrParam[4] = frmEmplyrNm;
		arrParam[5] = frmOrgnztNm;

	 	window.showModalDialog("<c:url value='/cop/smt/wmr/selectReportrListPopup.do' />", arrParam,"dialogWidth=800px;dialogHeight=500px;resizable=yes;center=yes");
	}
/* ********************************************************
 * ?¬ë ¥
 ******************************************************** */
	function fn_egov_init_date(){
		
		$("#reprtDe").datepicker(  
		        {dateFormat:'yy-mm-dd'
		         , showOn: 'button'
		         , buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>'
		         , buttonImageOnly: true
		         
		         , showMonthAfterYear: true
		         , showOtherMonths: true
			     , selectOtherMonths: true
					
		         , changeMonth: true // ?”ì„ ??select box ?œì‹œ (ê¸°ë³¸?€ false)
		         , changeYear: true  // ?„ì„ ??selectbox ?œì‹œ (ê¸°ë³¸?€ false)
		         , showButtonPanel: true // ?˜ë‹¨ today, done  ë²„íŠ¼ê¸°ëŠ¥ ì¶”ê? ?œì‹œ (ê¸°ë³¸?€ false)
		});

		$("#reprtBgnDe").datepicker( 
		        {dateFormat:'yy-mm-dd'
		         , showOn: 'button'
		         , buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>'  
		         , buttonImageOnly: true
		         
		         , showMonthAfterYear: true
		         , showOtherMonths: true
			     , selectOtherMonths: true
					
		         , changeMonth: true // ?”ì„ ??select box ?œì‹œ (ê¸°ë³¸?€ false)
		         , changeYear: true  // ?„ì„ ??selectbox ?œì‹œ (ê¸°ë³¸?€ false)
		         , showButtonPanel: true // ?˜ë‹¨ today, done  ë²„íŠ¼ê¸°ëŠ¥ ì¶”ê? ?œì‹œ (ê¸°ë³¸?€ false)
		});
		
		$("#reprtEndDe").datepicker( 
		        {dateFormat:'yy-mm-dd'
		         , showOn: 'button'
		         , buttonImage: '<c:url value='/images/egovframework/com/cmm/icon/bu_icon_carlendar.gif'/>'  
		         , buttonImageOnly: true
		         
		         , showMonthAfterYear: true
		         , showOtherMonths: true
			     , selectOtherMonths: true
					
		         , changeMonth: true // ?”ì„ ??select box ?œì‹œ (ê¸°ë³¸?€ false)
		         , changeYear: true  // ?„ì„ ??selectbox ?œì‹œ (ê¸°ë³¸?€ false)
		         , showButtonPanel: true // ?˜ë‹¨ today, done  ë²„íŠ¼ê¸°ëŠ¥ ì¶”ê? ?œì‹œ (ê¸°ë³¸?€ false)
		});
	}
</script>
</head>
<body onLoad="fn_egov_init_date();">
<noscript class="noScriptTitle"><spring:message code="common.noScriptTitle.msg" /></noscript><!-- ?ë°”?¤í¬ë¦½íŠ¸ë¥?ì§€?í•˜ì§€ ?ŠëŠ” ë¸Œë¼?°ì??ì„œ???¼ë? ê¸°ëŠ¥???¬ìš©?˜ì‹¤ ???†ìŠµ?ˆë‹¤. -->
<form:form modelAttribute="wikMnthngReprtVO" name="wikMnthngReprtVO" method="post" action="${pageContext.request.contextPath}/cop/smt/wmr/updateWikMnthngReprt.do" enctype="multipart/form-data">
<div class="wTableFrm">
	<!-- ?€?´í? -->
	<h2><spring:message code="copSmtWmr.wikMnthngReprtUpdt.wikMnthngReprtUpdt"/></h2><!-- ì£¼ê°„/?”ê°„ë³´ê³  ?˜ì • -->

	<!-- ?±ë¡??-->
	<table class="wTable">
		<colgroup>
			<col style="width:16%" />
			<col style="" />
		</colgroup>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.searchSe"/> <span class="pilsu">*</span></th><!-- ë³´ê³ ? í˜• -->
			<td class="left">
			    <form:radiobutton path="reprtSe" value="1" /><spring:message code="copSmtWmr.wikMnthngReprtUpdt.WeeklyReport"/><!-- ì£¼ê°„ë³´ê³  -->
				<form:radiobutton path="reprtSe" value="2" /><spring:message code="copSmtWmr.wikMnthngReprtUpdt.MonthlyReport"/><!-- ?”ê°„ë³´ê³  -->
				<div><form:errors path="reprtSe" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtDe"/> <span class="pilsu">*</span></th><!-- ë³´ê³ ?¼ì -->
			<td class="left">
				<c:set var="reprtDate"><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtDe"/></c:set>
				<form:input path="reprtDe" maxlength="10" title="${reprtDate}" cssStyle="width:70px" />
				<div><form:errors path="reprtDe" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtBgnEndDe"/> <span class="pilsu">*</span></th><!-- ?´ë‹¹?¼ì -->
			<td class="left">
				<c:set var="reprtBgnDate"><spring:message code="copSmtWmr.wikMnthngReprtRegist.bgnDe"/></c:set>
				<c:set var="reprtEndDate"><spring:message code="copSmtWmr.wikMnthngReprtRegist.endDe"/></c:set>
			    <form:input path="reprtBgnDe" maxlength="10" title="${reprtBgnDate}" cssStyle="width:70px" /> ~ 
				<form:input path="reprtEndDe" maxlength="10" title="${reprtEndDate}" cssStyle="width:70px"/>
				<div><form:errors path="reprtBgnDe" cssClass="error"/></div>
				<div><form:errors path="reprtEndDe" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.wrterNm"/> <span class="pilsu">*</span></th><!-- ?‘ì„±??-->
			<td class="left">
				<c:out value="${wikMnthngReprtVO.wrterNm}" escapeXml="false" />
				<input type="hidden" name="wrterId" id="wrterId" value="${wikMnthngReprtVO.wrterId}"/>
				<input type="hidden" name="wrterNm" id="wrterNm" value="${wikMnthngReprtVO.wrterNm}"/>
				<input type="hidden" name="wrterClsfNm" id="wrterClsfNm" value="${wikMnthngReprtVO.wrterClsfNm}"/>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reportrNm"/> <span class="pilsu">*</span></th><!-- ë³´ê³ ?€?ì -->
			<td class="left">
				<form:input path="reportrNm" readonly="true" maxlength="10" title="ë³´ê³ ?€?ëª…" cssStyle="width:98px"/>
				<a href="<c:url value='/cop/smt/wmr/selectReportrListPopup.do' />" target="_blank"  title="??ì°½ìœ¼ë¡??´ë™"  onclick="fn_egov_reportr_WikMnthngReprt('ë³´ê³ ?€?ì', 'reportrId', '', 'reportrNm', '');return false;">
					<img src="<c:url value='/images/egovframework/com/cmm/btn/btn_search.gif' />" alt="ë³´ê³ ?€?ì ê²€?? title="ë³´ê³ ?€?ì ê²€?? />
				</a>
			
				<div><form:errors path="reportrNm" cssClass="error"/></div>
				<form:hidden path="reportrId" />
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtSuj"/> <span class="pilsu">*</span></th><!-- ë³´ê³ ?œì œëª?-->
			<td class="left">
				<c:set var="reprtSubject"><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtSuj"/></c:set>
			    <form:input path="reprtSj" maxlength="255" title="${reprtSubject}"/>
      			<div><form:errors path="reprtSj" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtThswikCn"/> <span class="pilsu">*</span></th><!-- ê¸ˆì£¼ë³´ê³ ?´ìš© -->
			<td class="left">
			    <c:set var="reprtThswikContent"><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtThswikCn"/></c:set>
			    <form:textarea path="reprtThswikCn" rows="7" cols="90" title="${reprtThswikContent}"/>
  				<div><form:errors path="reprtThswikCn" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtLesseeCn"/> <span class="pilsu">*</span></th><!-- ì°¨ì£¼ë³´ê³ ?´ìš© -->
			<td class="left">
			    <c:set var="reprtLesseeContent"><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtLesseeCn"/></c:set>
			    <form:textarea path="reprtLesseeCn" rows="7" cols="90" title="${reprtLesseeContent}"/>
  				<div><form:errors path="reprtLesseeCn" cssClass="error"/></div>
			</td>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.partclrMatter"/></th><!-- ?¹ì´?¬í•­ -->
			<td class="left">
			    <c:set var="particularMatter"><spring:message code="copSmtWmr.wikMnthngReprtUpdt.partclrMatter"/></c:set>
			    <form:textarea path="partclrMatter" rows="5" cols="90" title="${particularMatter}"/>
  				<div><form:errors path="partclrMatter" cssClass="error"/></div>
			</td>
		</tr>
		<c:if test="${wikMnthngReprtVO.atchFileId ne null && wikMnthngReprtVO.atchFileId ne ''}">
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.atchFile"/></th><!-- ì²¨ë??Œì¼ ëª©ë¡ -->
			<td class="left">
			    <c:import charEncoding="utf-8" url="/cmm/fms/selectFileInfsForUpdate.do" >
					<c:param name="param_atchFileId" value="${egovc:encrypt(wikMnthngReprtVO.atchFileId)}" />
				</c:import>&nbsp;
			</td>
		</tr>
		</c:if>
		<tr>
			<th><label for="egovfile_0" id="file_label"><spring:message code="title.attachedFileSelect"/></label> <!-- ?Œì¼? íƒ --></th><!-- <spring:message code="copSmtWmr.wikMnthngReprtUpdt.file"/> ?Œì¼ì²¨ë? -->
			<td class="left">
				<input name="file_1" id="egovComFileUploader" type="file" title="${title}" multiple/><!-- ì²¨ë??Œì¼ëª??…ë ¥ -->
				<div id="egovComFileList"></div>  
			</td>
			<c:choose>
				<c:when test="${empty wikMnthngReprtVO.atchFileId}">
					<input name="atchFileAt" type="hidden" value="N">
				</c:when>
				<c:otherwise>
					<input name="atchFileAt" type="hidden" value="Y">
				</c:otherwise>
			</c:choose>
		</tr>
		<tr>
			<th><spring:message code="copSmtWmr.wikMnthngReprtUpdt.reprtSttus"/></th><!-- ë³´ê³ ???íƒœ -->
			<td class="left">
			    <c:out value="${wikMnthngReprtVO.reprtSttus}" escapeXml="false" />&nbsp;
			</td>
		</tr>
	</table>

	<!-- ?˜ë‹¨ ë²„íŠ¼ -->
	<div class="btn">
		<input class="s_submit" type="submit" value='<spring:message code="button.save" />' onclick="fn_egov_update_wikmnthngreprt(); return false;" /><!-- ?€??-->
		<span class="btn_s"><a href="<c:url value='/cop/smt/wmr/selectWikMnthngReprtList.do'/>?searchWrd=<c:out value='${wikMnthngReprtVO.searchWrd}'/>&amp;searchCnd=<c:out value='${wikMnthngReprtVO.searchCnd}'/>&amp;pageIndex=<c:out value='${wikMnthngReprtVO.pageIndex}'/>&amp;searchSttus=<c:out value='${wikMnthngReprtVO.searchSttus}'/>&amp;searchDe=<c:out value='${wikMnthngReprtVO.searchDe}'/>&amp;searchBgnDe=<c:out value='${wikMnthngReprtVO.searchBgnDe}'/>&amp;searchEndDe=<c:out value='${wikMnthngReprtVO.searchEndDe}'/>" onclick="fn_egov_list_wikmnthngreprt(); return false;"><spring:message code="button.list" /></a></span><!-- ëª©ë¡ -->
	</div>
	<div style="clear:both;"></div>
</div>

	<input type="hidden" name="returnUrl" value="<c:url value='/cop/smt/wmr/modifyWikMnthngReprt.do" />
	<!--form:hidden path="reprtId" / -->
	<input type="hidden" name="reprtId" value="<c:out value='${egovc:encryptId(wikMnthngReprtVO.reprtId)}'/>" />
	

	<input type="hidden" name="posblAtchFileNumber" id="posblAtchFileNumber" value="3" />
	<!-- //ì²¨ë??Œì¼ ê°œìˆ˜ë¥??„í•œ hidden -->

	<!-- ê²€?‰ì¡°ê±?? ì? -->
    <input type="hidden" name="searchWrd" value="<c:out value='${wikMnthngReprtVO.searchWrd}'/>" />
    <input type="hidden" name="searchCnd" value="<c:out value='${wikMnthngReprtVO.searchCnd}'/>" />
    <input type="hidden" name="pageIndex" value="<c:out value='${wikMnthngReprtVO.pageIndex}'/>" />
    <input type="hidden" name="searchSttus" value="<c:out value='${wikMnthngReprtVO.searchSttus}'/>" />
    <input type="hidden" name="searchDe" value="<c:out value='${wikMnthngReprtVO.searchDe}'/>" />
    <input type="hidden" name="searchBgnDe" value="<c:out value='${wikMnthngReprtVO.searchBgnDe}'/>" />
    <input type="hidden" name="searchEndDe" value="<c:out value='${wikMnthngReprtVO.searchEndDe}'/>" />
    <!-- ê²€?‰ì¡°ê±?? ì? -->
</form:form>
<!-- ì²¨ë??Œì¼ ?…ë¡œ??ê°€?¥í™”???¤ì • Start..-->  
<script type="text/javascript">
var maxFileNum = document.getElementById('posblAtchFileNumber').value;
if(maxFileNum==null || maxFileNum==""){
	maxFileNum = 3;
}
var multi_selector = new MultiSelector( document.getElementById( 'egovComFileList' ), maxFileNum );
multi_selector.addElement( document.getElementById( 'egovComFileUploader' ) );
</script> 
<!-- ì²¨ë??Œì¼ ?…ë¡œ??ê°€?¥í™”???¤ì • End.-->
</body>
</html>
