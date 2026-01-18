<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
    <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
        <%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
            <%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
                <% /* Image Path 설정 */ String imagePath_icon="/images/egovframework/com/sym/mnu/mcm/icon/" ; String
                    imagePath_button="/images/egovframework/com/sym/mnu/mcm/button/" ; %>
                    <script type="text/javascript">
                        var imgpath = "<c:url value='/images/egovframework/com/cmm/utl/'/>";
                        var getContextPath = "${pageContext.request.contextPath}";
                    </script>
                    <script language="javascript1.2" type="text/javaScript"
                        src="<c:url value='/js/egovframework/com/sym/mnu/mcm/EgovMenuCreatSiteMap.js' />"></script>
                    <script language="javascript1.2" type="text/javaScript">
<!--
/* ********************************************************
 * 조회 함수
 ******************************************************** */
function selectMenuCreatSiteMap() {
	document.menuCreatManageSiteMapForm.scrtyEstbstrgetId.value = opener.document.menuCreatManageForm.scrtyEstbstrgetId.value;
	document.menuCreatManageSiteMapForm.action = "<c:url value='/sym/mnu/mcm/EgovMenuCreatSiteMapSelect.do'/>";
    document.menuCreatManageSiteMapForm.submit();
}

/* ********************************************************
 * jsp 생성 함수
 ******************************************************** */
function CreatSiteMap() {
	fHtmlCreat_Head();
	usrID = document.menuCreatManageSiteMapForm.creatPersonId.value;
	authorCode = document.menuCreatManageSiteMapForm.authorCode.value;
	document.menuCreatManageSiteMapForm.valueHtml.value    = vHtmlCode;
	document.menuCreatManageSiteMapForm.bndeFileNm.value   = authorCode+"_SiteMap.jsp";
	document.menuCreatManageSiteMapForm.mapCreatId.value   = authorCode;
	document.menuCreatManageSiteMapForm.action = "<c:url value='/sym/mnu/mcm/EgovMenuCreatSiteMapInsert.do'/>";
    document.menuCreatManageSiteMapForm.submit();
}

/* ********************************************************
* 메뉴 호출 함수
******************************************************** */
function fCallUrl(url) {
	window.open(url,'dokdo','width=800,height=600,menubar=no,toolbar=no,location=no,resizable=no,status=no,scrollbars=no,top=300,left=700');
}

<c:if test="${!empty resultMsg}">alert("${resultMsg}");</c:if>
-->
</script>

                    <form name="menuCreatManageSiteMapForm"
                        action="<c:url value='/sym/mnu/mcm/EgovMenuCreatSiteMapSelect.do' />" method="post">
                        <div style="visibility:hidden;display:none;"><input name="iptSubmit" type="submit"
                                value="<spring:message code=" comSymMnuMpm.MenuCreatSiteMap.send" />" title="
                            <spring:message code="comSymMnuMpm.MenuCreatSiteMap.send" />">
                        </div><!-- 전송 -->
                        <input name="valueHtml" type="hidden" />
                        <input name="creatPersonId" type="hidden" value="<c:out value='${resultVO.creatPersonId}'/>" />
                        <input name="bndeFileNm" type="hidden" />
                        <input name="bndeFilePath" type="hidden" />
                        <input name="mapCreatId" type="hidden" />
                        <input name="tmp_rootPath" type="hidden" />

                        <div class="board" style="width:530px">
                            <h1>
                                <spring:message code="comSymMnuStm.siteMapng.siteMap" />
                            </h1><!-- 사이트맵 -->

                            <div class="search_box" title="<spring:message code=" common.searchCondition.msg" />">
                            <ul>
                                <li>
                                    <label for="">
                                        <spring:message code="comSymMnuMpm.MenuCreatSiteMap.authCode" /> :
                                    </label><!-- 권한코드 -->
                                    <input class="s_input2 vat" name="authorCode" type="text"
                                        value="<c:out value='${resultVO.authorCode}'/>" size="20" maxlength="30"
                                        title="<spring:message code=" comSymMnuMpm.MenuCreatSiteMap.authName" />"
                                    readonly="readonly" /><!-- 권한명 -->
                                    <input class="s_input2 vat" name="chkCreat" type="text"
                                        value="<c:out value='${resultBoolean.chkCreat}'/>" size="10" maxlength="10"
                                        title="<spring:message code=" comSymMnuMpm.MenuCreatSiteMap.authCode" />"
                                    readonly="readonly" /><!-- 권한코드 -->
                                </li>
                            </ul>
                        </div>

                        <c:forEach var="result1" items="${list_menulist}" varStatus="status">
                            <input type="hidden" name="tmp_menuNmVal"
                                value="${result1.menuNo}|${result1.upperMenuId}|${result1.menuNm}|${result1.menuOrdr}|${result1.chkUrl}|">
                        </c:forEach>

                        <div class="tree" style="width:480px;" id="treeSiteMap">
                            <script language="javascript" type="text/javaScript">
			function init() {
				var Tree = new Array;
				var baseObj = document.getElementById("treeSiteMap");
				if ( typeof document.getElementsByName("tmp_menuNmVal") == "undefined" 
						|| typeof document.getElementsByName("tmp_menuNmVal").length == "undefined" ) {
	            	// alert("<spring:message code="comSymMnuMpm.MenuCreatSiteMap.validate.menuNmVal.none2" />"); 
                    // Suppressed alert/close for embed mode or handle gracefully
				} else {
					for (var j = 0; j < document.getElementsByName("tmp_menuNmVal").length; j++) {
						Tree[j] = document.getElementsByName("tmp_menuNmVal")[j].value;
					}
					createTree(baseObj,Tree);
	            }
			}
            // Execute init immediately as this is a fragment
            init();
		</script>
                        </div>
                        </div>

                    </form>