/*
 * Copyright 2008-2009 MOPAS(MINISTRY OF SECURITY AND PUBLIC ADMINISTRATION).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package egovframework.com.cmm.filter;

import java.io.IOException;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 *
 * SessionTimeoutCookieFilter
 * 
 * @author 怨듯넻而댄룷?뚰듃 ? ?좎슜??
 * @since 2020.06.17
 * @version 3.10.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2020.06.17  ?좎슜??         理쒖큹 ?앹꽦
 *   2025.05.24  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UncommentedEmptyMethodBody(二쇱꽍 泥섎━?섏? ?딆? 鍮?硫붿꽌??蹂몃Ц)
 *
 *      </pre>
 */

public class SessionTimeoutCookieFilter implements Filter {

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		HttpServletResponse httpResponse = (HttpServletResponse) response;
		HttpServletRequest httpRequest = (HttpServletRequest) request;
		long serverTime = System.currentTimeMillis();
		long sessionExpireTime = serverTime + httpRequest.getSession().getMaxInactiveInterval() * 1000;
		Cookie cookie = new Cookie("egovLatestServerTime", "" + serverTime);
		boolean secure = request.isSecure();
		if (secure) {
			cookie.setSecure(true);
		}
		cookie.setHttpOnly(true);
		cookie.setPath("/");
		httpResponse.addCookie(cookie);
		cookie = new Cookie("egovExpireSessionTime", "" + sessionExpireTime);
		if (secure) {
			cookie.setSecure(true);
		}
		cookie.setHttpOnly(true);
		cookie.setPath("/");

//        Date dateServer = new java.util.Date(serverTime);
//        Date dateExpiry = new java.util.Date(sessionExpireTime);
//        SimpleDateFormat format = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

//        String serverYMD = format.format(dateServer);
//        String expiryYMD = format.format(dateExpiry);
		// System.out.println("=====>>> serverYMD = "+serverYMD);
		// System.out.println("=====>>> expiryYMD = "+expiryYMD);
		// System.out.println("=====>>> server TimeStamp = "+serverTime);
		// System.out.println("=====>>> expire TimeStamp = "+sessionExpireTime);

		httpResponse.addCookie(cookie);

		chain.doFilter(request, response);
	}

}
