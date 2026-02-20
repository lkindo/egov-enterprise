package egovframework.com.cmm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.WebApplicationInitializer;
import org.springframework.web.context.ContextLoaderListener;
import org.springframework.web.context.support.XmlWebApplicationContext;
import org.springframework.web.filter.DelegatingFilterProxy;
import org.springframework.web.multipart.support.MultipartFilter;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.FrameworkServlet;

import egovframework.com.cmm.filter.HTMLTagFilter;
import egovframework.com.cmm.filter.SessionTimeoutCookieFilter;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.uat.uap.filter.EgovLoginPolicyFilter;
import egovframework.com.utl.wed.filter.CkFilter;
import jakarta.servlet.FilterRegistration;
import jakarta.servlet.MultipartConfigElement;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRegistration;

/**
 * EgovWebApplicationInitializer ?대옒??
 * <Notice>
 * 	   ?ъ슜???몄쬆 沅뚰븳泥섎━瑜?遺꾨━(session, spring security) ?섍린 ?꾪빐??web.xml??湲곕뒫??
 * 	   Servlet3.x WebApplicationInitializer 湲곕뒫?쇰줈 泥섎━
 * <Disclaimer>
 *		N/A
 *
 * @author ?λ룞??
 * @since 2016.06.23
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2016.06.23  ?λ룞??         理쒖큹 ?앹꽦
 *   2018.10.02  ?좎슜??         Facebook 愿??HiddenHttpMethodFilter 異붽?
 *   2018.10.26  ?좎슜??         EgovLoginPolicyFilter 異붽? (IP?묎렐泥섎━)
 *   2018.12.03  ?좎슜??         springMultipartFilter,HTMLTagFilter 異붽? (XSS諛⑹?泥섎━)
 *   2025.05.23  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
public class EgovWebApplicationInitializer implements WebApplicationInitializer {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovWebApplicationInitializer.class);

    private static final String TMP_LOCATION = "";				// ?낅줈???꾩떆 ?붾젆?곕━, 鍮?臾몄옄?댁씠硫?而⑦뀒?대꼫 湲곕낯 tmp ?ъ슜
	private static final long MAX_FILE_SIZE = 104857600L;		// 媛쒕퀎?뚯씪 理쒕??ш린 (100MB)
    private static final long MAX_REQUEST_SIZE = 104857600L;	// ?꾩껜?붿껌 理??ш린 (100MB)
    private static final int  FILE_SIZE_THRESHOLD = 104876;		// 硫붾え由??꾧퀎媛?(1MB)

	@Override
	public void onStartup(ServletContext servletContext) throws ServletException {

		LOGGER.debug("EgovWebApplicationInitializer START-============================================");

		//-------------------------------------------------------------
		// Egov Web ServletContextListener ?ㅼ젙
		//-------------------------------------------------------------
		servletContext.addListener(new egovframework.com.cmm.context.EgovWebServletContextListener());

		//-------------------------------------------------------------
		// Spring CharacterEncodingFilter ?ㅼ젙
		//-------------------------------------------------------------
		FilterRegistration.Dynamic characterEncoding = servletContext.addFilter("encodingFilter", new org.springframework.web.filter.CharacterEncodingFilter());
		characterEncoding.setInitParameter("encoding", "UTF-8");
		characterEncoding.setInitParameter("forceEncoding", "true");
		characterEncoding.addMappingForUrlPatterns(null, false, "*.do");
		//characterEncoding.addMappingForUrlPatterns(EnumSet.of(DispatcherType.REQUEST), true, "*.do");

		//-------------------------------------------------------------
		// Spring ServletContextListener ?ㅼ젙
		// -------------------------------------------------------------
		XmlWebApplicationContext rootContext = new XmlWebApplicationContext(); // NOPMD - CloseResource(由ъ냼???リ린)
		rootContext.setConfigLocations(new String[] { "classpath*:egovframework/spring/com/**/context-*.xml" });
		//rootContext.setConfigLocations(new String[] { "classpath*:egovframework/spring/com/context-*.xml","classpath*:egovframework/spring/com/*/context-*.xml" });
		rootContext.refresh();
		rootContext.start();

		servletContext.addListener(new ContextLoaderListener(rootContext));

		// -------------------------------------------------------------
		// Spring ServletContextListener ?ㅼ젙
		// -------------------------------------------------------------
		XmlWebApplicationContext xmlWebApplicationContext = new XmlWebApplicationContext(); // NOPMD - CloseResource
		xmlWebApplicationContext.setConfigLocation("/WEB-INF/config/egovframework/springmvc/egov-com-*.xml");
		ServletRegistration.Dynamic dispatcher = servletContext.addServlet("dispatcher", new DispatcherServlet(xmlWebApplicationContext));
		//dispatcher.addMapping("*.do");
		dispatcher.addMapping("/"); // Facebook OAuth ?먯꽌 ?ъ슜
		dispatcher.setLoadOnStartup(1);

		// StandardServletMultipartResolver瑜??꾪븳 Multipart ?ㅼ젙 異붽?
		MultipartConfigElement multipartConfig = new MultipartConfigElement(TMP_LOCATION, MAX_FILE_SIZE, MAX_REQUEST_SIZE, FILE_SIZE_THRESHOLD);
		dispatcher.setMultipartConfig(multipartConfig);

		if("security".equals(EgovProperties.getProperty("Globals.Auth").trim())) {

			//-------------------------------------------------------------
			// springSecurityFilterChain ?ㅼ젙
			//-------------------------------------------------------------
			DelegatingFilterProxy securityFilter = new DelegatingFilterProxy("springSecurityFilterChain");
	        securityFilter.setContextAttribute(FrameworkServlet.SERVLET_CONTEXT_PREFIX + "dispatcher");
	        FilterRegistration.Dynamic security = servletContext.addFilter("springSecurityFilterChain", securityFilter);
	        security.addMappingForUrlPatterns(null, false, "/*");

			//-------------------------------------------------------------
			// HttpSessionEventPublisher ?ㅼ젙
			//-------------------------------------------------------------
			servletContext.addListener(new org.springframework.security.web.session.HttpSessionEventPublisher());

		} else if("session".equals(EgovProperties.getProperty("Globals.Auth").trim())) {

			//-------------------------------------------------------------
			// EgovLoginPolicyFilter ?ㅼ젙
			//-------------------------------------------------------------
			FilterRegistration.Dynamic egovLoginPolicyFilter = servletContext.addFilter("LoginPolicyFilter", new EgovLoginPolicyFilter());
			egovLoginPolicyFilter.addMappingForUrlPatterns(null, false, "/uat/uia/actionLogin.do");

		}

		//-------------------------------------------------------------
		// CkFilter ?ㅼ젙 (CKEditor ?ъ슜???ㅼ젙)
		//-------------------------------------------------------------
		FilterRegistration.Dynamic regCkFilter = servletContext.addFilter("CKFilter", new CkFilter());
		regCkFilter.setInitParameter("properties", "egovframework/egovProps/ck.properties");
		regCkFilter.addMappingForUrlPatterns(null, false, "/ckUploadImage");

		//-------------------------------------------------------------
		// HiddenHttpMethodFilter ?ㅼ젙 (Facebook OAuth ?ъ슜???ㅼ젙)
		//-------------------------------------------------------------
		//FilterRegistration.Dynamic hiddenHttpMethodFilter = servletContext.addFilter("hiddenHttpMethodFilter", new HiddenHttpMethodFilter());
		//hiddenHttpMethodFilter.addMappingForUrlPatterns(null, false, "/*");

		//-------------------------------------------------------------
		// Tomcat??寃쎌슦 allowCasualMultipartParsing="true" 異붽?
		// <Context docBase="" path="/" reloadable="true" allowCasualMultipartParsing="true">
		//-------------------------------------------------------------
		MultipartFilter springMultipartFilter = new MultipartFilter();
		springMultipartFilter.setMultipartResolverBeanName("multipartResolver");
		FilterRegistration.Dynamic multipartFilter = servletContext.addFilter("springMultipartFilter", springMultipartFilter);
		multipartFilter.addMappingForUrlPatterns(null, false, "*.do");

		//-------------------------------------------------------------
	    // HTMLTagFilter??寃쎌슦???뚮씪誘명꽣????섏뿬 XSS ?ㅻ쪟 諛⑹?瑜??꾪븳 蹂?섏쓣 泥섎━?⑸땲??
		//-------------------------------------------------------------
	    // HTMLTagFIlter??寃쎌슦??JSP??<c:out /> ?깆쓣 ?ъ슜?섏? 紐삵븯???뱀닔???곹솴?먯꽌 ?ъ슜?섏떆硫??⑸땲??
	    // (<c:out />??寃쎌슦 酉곕떒?먯꽌 ?곗씠??異쒕젰??XSS 諛⑹? 泥섎━媛 ??
		FilterRegistration.Dynamic htmlTagFilter = servletContext.addFilter("htmlTagFilter", new HTMLTagFilter());
		htmlTagFilter.addMappingForUrlPatterns(null, false, "*.do");

		//-------------------------------------------------------------
	    // SessionTimeoutCookieFilter??荑좏궎????꾩븘???쒓컙??湲곕줉?쒕떎.
		//-------------------------------------------------------------
	    // latestServerTime - ?쒕쾭 理쒓렐 ?쒓컙
	    // expireSessionTime - ?몄뀡??留뚮즺?섎뒗 ?쒓컙
		FilterRegistration.Dynamic sessionTimeoutFilter = servletContext.addFilter("sessionTimeoutFilter", new SessionTimeoutCookieFilter());
		sessionTimeoutFilter.addMappingForUrlPatterns(null, false, "*.do");

		//-------------------------------------------------------------
		// Spring RequestContextListener ?ㅼ젙
		//-------------------------------------------------------------
		servletContext.addListener(new org.springframework.web.context.request.RequestContextListener());

		LOGGER.debug("EgovWebApplicationInitializer END-============================================");

	}

}
