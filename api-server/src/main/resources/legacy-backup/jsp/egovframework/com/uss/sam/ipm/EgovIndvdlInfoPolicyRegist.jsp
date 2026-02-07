<%-- Class Name : EgovIndvdlInfoPolicyRegist.jsp Description : 개인정보보호정책 등록 페이지 Modification Information 수정일 수정자 수정내용
	----------- ------------- --------------------------- 2008.03.09 장동한 최초 생성 2014.12.08 표준프레임워크 웹에디터(WYSIWYG) 적용
	2018.09.03 이정은 공통컴포넌트 3.8 개선 author : 공통서비스 개발팀 장동한 since : 2009.03.09 --%>
	<%@ page contentType="text/html; charset=utf-8" %>
		<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
			<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui" %>
				<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
					<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
						<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
							<%@ taglib prefix="form" uri="http://www.springframework.org/tags/form" %>
								<%--@ taglib prefix="ckeditor" uri="http://ckeditor.com" --%>
									<c:set var="ImgUrl" value="/images/egovframework/com/uss/sam/ipm/" />
									<c:set var="CssUrl" value="/css/egovframework/com/uss/sam/ipm/" />

									<c:set var="pageTitle">
										<spring:message
											code="ussSamIpm.indvdlInfoPolicyRegist.indvdlInfoPolicyRegist" />
									</c:set>
									<c:set var="msgIndvdlInfoNm">
										<spring:message code="ussSamIpm.indvdlInfoPolicyRegist.indvdlInfoNm" />
									</c:set>
									<c:set var="msgIndvdlInfoYn">
										<spring:message code="ussSamIpm.indvdlInfoPolicyRegist.indvdlInfoYn" />
									</c:set>
									<c:set var="msgIndvdlInfoDc">
										<spring:message code="ussSamIpm.indvdlInfoPolicyRegist.indvdlInfoDc" />
									</c:set>
									<c:set var="buttonSave">
										<spring:message code="button.save" />
									</c:set>
									<c:set var="buttonList">
										<spring:message code="button.list" />
									</c:set>
									<c:set var="confirmSave">
										<spring:message code="common.save.msg" />
									</c:set>

									<!DOCTYPE html>
									<html lang="ko">

									<head>
										<meta http-equiv="content-type" content="text/html; charset=utf-8">
										<title>${pageTitle}</title><!-- 개인정보보호정책 등록 -->
										<link href="<c:url value='/css/egovframework/com/com.css' />" rel="stylesheet"
											type="text/css">
										<link href="<c:url value='/css/egovframework/com/button.css' />"
											rel="stylesheet" type="text/css">
										<script type="text/javascript"
											src="<c:url value='/js/egovframework/com/cmm/EgovValidation.js' />"></script>
										<script type="text/javascript"
											src="<c:url value='/js/egovframework/com/sym/cal/EgovCalPopup.js' />"></script>
										<script type="text/javaScript" language="javascript">
/* ********************************************************
 * 초기화
 ******************************************************** */
function fn_egov_init_IndvdlInfoPolicy(){
}
/* ********************************************************
 * 목록 으로 가기
 ******************************************************** */
function fn_egov_list_IndvdlInfoPolicy(){
	location.href = "<c:url value='/uss/sam/ipm/listIndvdlInfoPolicy.do' />";
}
/* ********************************************************
 * 저장처리화면
 ******************************************************** */
function fn_egov_save_IndvdlInfoPolicy(){
	var varFrom = document.indvdlInfoPolicy;
	if(confirm("${confirmSave}")){
		varFrom.action =  "<c:url value='/uss/sam/ipm/registIndvdlInfoPolicy.do' />";
		if(!validateIndvdlInfoPolicy(varFrom)){
			return;
		}else{
			varFrom.submit();
		}
	}
}
</script>
									</head>

									<body onLoad="fn_egov_init_IndvdlInfoPolicy();">
										<form:form modelAttribute="indvdlInfoPolicy" name="indvdlInfoPolicy"
											action="${pageContext.request.contextPath}/uss/sam/ipm/registIndvdlInfoPolicy.do"
											method="post" enctype="multipart/form-data">
											<div class="wTableFrm">
												<!-- 타이틀 -->
												<h2>${pageTitle}</h2><!-- 개인정보보호정책 등록 -->

												<!-- 등록폼 -->
												<table class="wTable">
													<colgroup>
														<col style="width:25%" />
														<col style="" />
													</colgroup>
													<tr>
														<th>${msgIndvdlInfoNm} <span class="pilsu">*</span></th>
														<!-- 개인정보보호정책 명 -->
														<td class="left">
															<form:input path="indvdlInfoNm" size="73" cssClass="txaIpt"
																maxlength="255" />
															<form:errors path="indvdlInfoNm" cssClass="error" />
														</td>
													</tr>
													<tr>
														<th>${msgIndvdlInfoYn} <span class="pilsu">*</span></th>
														<!-- 동의여부 -->
														<td class="left">
															<select title="${msgIndvdlInfoYn}" name="indvdlInfoYn"
																id="indvdlInfoYn">
																<option value="Y">
																	<spring:message code="input.yes" />
																</option><!-- 예 -->
																<option value="N">
																	<spring:message code="input.no" />
																</option><!-- 아니오 -->
															</select>
														</td>
													</tr>
													<tr>
														<th>${msgIndvdlInfoDc} <span class="pilsu">*</span></th>
														<!-- 개인정보보호정책 내용 -->
														<td class="left">
															<form:textarea path="indvdlInfoDc" rows="75" cols="14"
																cssClass="txaClass2" />
															<form:errors path="indvdlInfoDc" cssClass="error" />
														</td>
													</tr>
												</table>

												<!-- 하단 버튼 -->
												<div class="btn">
													<input class="s_submit" type="submit" value="${buttonSave}"
														onclick="fn_egov_save_IndvdlInfoPolicy(); return false;" />
													<span class="btn_s"><a
															href="<c:url value='/uss/sam/ipm/listIndvdlInfoPolicy.do' />">${buttonList}</a></span>
												</div>
											</div>
											<input name="cmd" type="hidden" value="<c:out value='save'/>">
										</form:form>
										<%-- <ckeditor:replace replace="indvdlInfoDc"
											basePath="${pageContext.request.contextPath}/html/egovframework/com/cmm/utl/ckeditor/" />
										--%>
									</body>

									</html>