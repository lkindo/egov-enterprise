package egovframework.com.cmm.util;

import java.io.IOException;

import org.springframework.util.AntPathMatcher;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * URL ?ъ옉???꾪꽣
 * 
 * @author ?꾩옄?뺣? ?쒖??꾨젅?꾩썙???좎?蹂댁닔
 * @since 2014. 09.30
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.09.30  ?쒗봽??         理쒖큹?앹꽦
 *   2020.11.02  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (CRLF ?쒓굅 議곗튂)
 *   2025.05.28  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-StringInstantiation(臾몄옄???몄뒪?댁뒪??
 *
 *      </pre>
 */
public class EgovUrlRewriteFilter implements Filter {

	@SuppressWarnings("unused")
	private FilterConfig config;

	private String targetURI;
	private String httpsPort;
	private String httpPort;

	private String[] uriPatterns;

	@Override
	public void init(FilterConfig config) throws ServletException {

		String delimiter = ",";
		this.config = config;

		this.targetURI = config.getInitParameter("targetURI");
		this.httpsPort = config.getInitParameter("httpsPort");
		this.httpPort = config.getInitParameter("httpPort");

		this.uriPatterns = targetURI.split(delimiter);

	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws ServletException, IOException {

		HttpServletRequest req = (HttpServletRequest) request;
		HttpServletResponse res = (HttpServletResponse) response;

		String uri = req.getRequestURI();
		String getProtocol = req.getScheme();
		String getDomain = req.getServerName();

		AntPathMatcher pm = new AntPathMatcher();

		for (String uriPattern : uriPatterns) {

			if (pm.match(uriPattern.trim(), uri)) {

				if (getProtocol.toLowerCase().equals("http")) {

					response.setContentType("text/html");

					String httpsPath = "https" + "://" + getDomain + ":" + httpsPort + uri;
					res.setStatus(HttpServletResponse.SC_MOVED_TEMPORARILY);
					res.setHeader("Location", EgovWebUtil.removeCRLF(httpsPath));

				}

			} else if (getProtocol.toLowerCase().equals("https")) {

				response.setContentType("text/html");

				String httpPath = "http" + "://" + getDomain + ":" + httpPort + uri;

				res.setStatus(HttpServletResponse.SC_MOVED_TEMPORARILY);
				res.setHeader("Location", EgovWebUtil.removeCRLF(httpPath));

			}
		}

		chain.doFilter(req, res);

	}

	@Override
	public void destroy() {
		this.targetURI = null;
		this.httpsPort = null;
		this.httpPort = null;
		this.uriPatterns = null;
	}

}
