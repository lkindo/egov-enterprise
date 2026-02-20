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
 * URL ??????
 * 
 * @author ??? ???????????
 * @since 2014. 09.30
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2014.09.30  ????         ???
 *   2020.11.02  ???         KISA ?? ??(CRLF ?? ??
 *   2025.05.28  ????         PMD???????? ????????-StringInstantiation(?????????
 *
 *      </pre>
 **/
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
