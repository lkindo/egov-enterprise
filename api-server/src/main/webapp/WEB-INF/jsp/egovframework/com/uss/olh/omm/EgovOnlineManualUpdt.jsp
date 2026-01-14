<%-- Class Name : EgovOnlineManualUpdt.jsp Description : EgovOnlineManualUpdt 화면 Modification Information 수정일 수정자 수정내용
	------- -------- --------------------------- 2009.02.01 박정규 최초 생성 2016.06.13 김연호 표준프레임워크 v3.6 개선 --%>
	<%@ page language="java" contentType="text/html; charset=UTF-8" %>
		<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
			<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
				<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
					<%@ taglib prefix="form" uri="http://www.springframework.org/tags/form" %>
						<%--@ taglib prefix="ckeditor" uri="http://ckeditor.com" --%>
							<c:set var="pageTitle">
								<spring:message code="comUssOlhOmm.onlineManualVO.title" />
							</c:set>
							<c:set var="titleUpdate">
								<spring:message code="title.update" />
							</c:set>
							<c:set var="inputTxt">
								<spring:message code="input.input" />
							</c:set>
							<c:set var="titleOnlineMnlNm">
								<spring:message code="comUssOlhOmm.onlineManualVO.onlineMnlNm" />
							</c:set>
							<c:set var="titleOnlineMnlSeCode">
								<spring:message code="comUssOlhOmm.onlineManualVO.onlineMnlSeCode" />
							</c:set>
							<c:set var="titleOnlineMnlDf">
								<spring:message code="comUssOlhOmm.onlineManualVO.onlineMnlDf" />
							</c:set>
							<c:set var="titleOnlineMnlDc">
								<spring:message code="comUssOlhOmm.onlineManualVO.onlineMnlDc" />
							</c:set>
							<c:set var="buttonUpdate">
								<spring:message code="button.update" />
							</c:set>
							<c:set var="buttonList">
								<spring:message code="button.list" />
							</c:set>
							<c:set var="confirmUpdate">
								<spring:message code="common.update.msg" />
							</c:set>

							<!DOCTYPE html>
							<html>

							<head>
								<title>${pageTitle} ${titleUpdate}</title>
								<meta http-equiv="content-type" content="text/html; charset=utf-8">
								<link type="text/css" rel="stylesheet"
									href="<c:url value='/css/egovframework/com/com.css' />">
								<script type="text/javascript"
									src="<c:url value='/js/egovframework/com/cmm/EgovValidation.js' />"></script>
								<script type="text/javascript">
									function fn_egov_init() {
										document.getElementById("onlineManualVO").onlineMnlNm.focus();
									}
									function fn_egov_updt_onlinemanual(form) {
										if (!validateOnlineManualVO(form)) {
											return false;
										} else {
											if (confirm("${confirmUpdate}")) {
												form.submit();
											}
										}
									}
									function fn_egov_inqire_list() {
										var form = document.getElementById("onlineManualVO");
										form.action = "<c:url value='/uss/olh/omm/selectOnlineManualList.do'/>";
										form.submit();
									}
								</script>
							</head>

							<body onLoad="fn_egov_init();">
								<noscript class="noScriptTitle">
									<spring:message code="common.noScriptTitle.msg" />
								</noscript>
								<form:form modelAttribute="onlineManualVO"
									action="${pageContext.request.contextPath}/uss/olh/omm/updateOnlineManual.do"
									method="post" onSubmit="fn_egov_updt_onlinemanual(this); return false;">
									<div class="wTableFrm">
										<h2>${pageTitle} ${titleUpdate}</h2>
										<table class="wTable"
											summary="<spring:message code='common.summary.update' arguments='${pageTitle}' />">
											<caption>${pageTitle} ${titleUpdate}</caption>
											<colgroup>
												<col style="width: 20%;">
												<col style="width: ;">
											</colgroup>
											<tbody>
												<tr>
													<th><label for="onlineMnlNm">${titleOnlineMnlNm} <span
																class="pilsu">*</span></label></th>
													<td class="left">
														<form:input path="onlineMnlNm"
															title="${titleOnlineMnlNm} ${inputTxt}" size="70"
															maxlength="70" />
														<div>
															<form:errors path="onlineMnlNm" cssClass="error" />
														</div>
													</td>
												</tr>
												<tr>
													<th><label for="onlineMnlSeCode">${titleOnlineMnlSeCode} <span
																class="pilsu">*</span></label></th>
													<td class="left">
														<form:select path="onlineMnlSeCode"
															title="${titleOnlineMnlSeCode} ${inputTxt}" cssClass="txt">
															<form:option value="" label="--선택하세요--" />
															<form:options items="${onlineMnlSeCode}" itemValue="code"
																itemLabel="codeNm" />
														</form:select>
														<div>
															<form:errors path="onlineMnlSeCode" cssClass="error" />
														</div>
													</td>
												</tr>
												<tr>
													<th><label for="onlineMnlDf">${titleOnlineMnlDf} <span
																class="pilsu">*</span></label></th>
													<td class="nopd" colspan="3">
														<form:textarea path="onlineMnlDf"
															title="${titleOnlineMnlDf} ${inputTxt}" cols="300"
															rows="20" />
														<div>
															<form:errors path="onlineMnlDf" cssClass="error" />
														</div>
													</td>
												</tr>
												<tr>
													<th><label for="onlineMnlDc">${titleOnlineMnlDc} <span
																class="pilsu">*</span></label></th>
													<td class="nopd" colspan="3">
														<form:textarea path="onlineMnlDc"
															title="${titleOnlineMnlDc} ${inputTxt}" cols="300"
															rows="20" />
														<%-- <ckeditor:replace replace="onlineMnlDc"
															basePath="${pageContext.request.contextPath}/html/egovframework/com/cmm/utl/ckeditor/" />
														--%>
														<div>
															<form:errors path="onlineMnlDc" cssClass="error" />
														</div>
													</td>
												</tr>
											</tbody>
										</table>
										<div class="btn">
											<input type="submit" class="s_submit" value="${buttonUpdate}" />
											<span class="btn_s"><a
													href="<c:url value='/uss/olh/omm/selectOnlineManualList.do' />">${buttonList}</a></span>
										</div>
										<div style="clear:both;"></div>
									</div>
									<input name="onlineMnlId" type="hidden"
										value="<c:out value='${onlineManualVO.onlineMnlId}'/>">
								</form:form>
							</body>

							</html>