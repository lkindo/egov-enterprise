/*
 * CKEditor image upload module for Java.
 * Copyright guavatak (https://github.com/guavatak/ckeditor-upload-filter-java)
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
 *
 * @author guavatak (https://github.com/guavatak/ckeditor-upload-filter-java)
 */
package egovframework.com.utl.wed.filter;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.apache.commons.lang3.StringUtils;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.extern.slf4j.Slf4j;

/**
 *  Filter class
 * @author guavatak
 * @since 2014.12.04
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??       ?섏젙??      ?섏젙?댁슜
 *  ----------  --------    ---------------------------
 *  2014.12.04	?쒖??꾨젅?꾩썙??理쒖큹 ?곸슜 (?⑦궎吏 蹂寃?諛??뚯뒪 ?뺣━)
 *  2018.12.28	?좎슜??	  CkImageSaver ?섏젙
 *  2025.09.06	?≫븯??	  2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 * </pre>
 */
@Slf4j
public class CkFilter implements Filter {

	private static final String IMAGE_BASE_DIR_KEY = "ck.image.dir";
	private static final String IMAGE_BASE_URL_KEY = "ck.image.url";
	private static final String IMAGE_ALLOW_TYPE_KEY = "ck.image.type.allow";
	private static final String IMAGE_SAVE_CLASS_KEY = "ck.image.save.class";

	private CkImageSaver ckImageSaver;

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {
		String properties = filterConfig.getInitParameter("properties");
		Properties props = new Properties();
		try (InputStream inStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(properties);) {
			props.load(inStream);
		} catch (IOException e) {
			if (log.isErrorEnabled()) {
				log.error("IOException", e);
			}
		}

		String imageBaseDir = (String)props.get(IMAGE_BASE_DIR_KEY);
		String imageDomain = (String)props.get(IMAGE_BASE_URL_KEY);
		String saveManagerClass = (String)props.get(IMAGE_SAVE_CLASS_KEY);
		String allowFileType = (String)props.get(IMAGE_ALLOW_TYPE_KEY);

		ckImageSaver = new CkImageSaver(
			imageBaseDir,
			imageDomain,
			StringUtils.isNotBlank(allowFileType) ? StringUtils.split(allowFileType, ",") : new String[] {""},
			saveManagerClass);//2022.01. Method call passes null for non-null parameter 泥섎━

	}

	@Override
	public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
		throws IOException, ServletException {
		HttpServletRequest request = (HttpServletRequest)req;
		HttpServletResponse response = (HttpServletResponse)res;

		if (request.getContentType() == null || request.getContentType().indexOf("multipart") == -1) {
			// contentType ??multipart 媛 ?꾨땲?쇰㈃ ?ㅽ궢?쒕떎.
			chain.doFilter(request, response);
		} else {
			ckImageSaver.saveAndReturnUrlToClient(request, response);

		}
	}

	@Override
	public void destroy() {
		// no-op
	}
}
