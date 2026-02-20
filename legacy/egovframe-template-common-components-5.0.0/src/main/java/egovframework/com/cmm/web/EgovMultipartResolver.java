package egovframework.com.cmm.web;

/*
 * Copyright 2001-2006 The Apache Software Foundation.
 *
 * Licensed under the Apache License, Version 2.0 (the ";License&quot;);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS"; BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.utl.fcc.service.EgovFileUploadUtil;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ?ㅽ뻾?섍꼍???뚯씪?낅줈??泥섎━瑜??꾪븳 湲곕뒫 ?대옒??
 *
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??               ?섏젙??            ?섏젙?댁슜
 *  ----------   --------    ---------------------------
 *  2009.03.25   ?댁궪??             理쒖큹 ?앹꽦
 *  2011.06.11   ?쒖???             ?ㅽ봽留?3.0 ?낃렇?덉씠??API蹂寃쎌쑝濡쒖씤???섏젙
 *  2020.10.27   ?좎슜??             ?덉쇅泥섎━ ?섏젙
 *  2020.10.29   ?좎슜??             ?덉슜?섏? ?딅뒗 ?뺤옣???낅줈???쒗븳 (globals.properties > Globals.fileUpload.Extensions)
 *  2025.07.01   ?좎?蹂댁닔            Spring Framework 6.2.8, JDK 17 湲곕컲?쇰줈 ?낅뜲?댄듃
 *
 *      </pre>
 */
public class EgovMultipartResolver extends StandardServletMultipartResolver {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMultipartResolver.class);

	public EgovMultipartResolver() {
		super();
	}

	/**
	 * multipart ?붿껌???뚯떛?섏뿬 ?뚯씪 ?낅줈??蹂댁븞 寃利앹쓣 ?섑뻾?쒕떎.
	 * 
	 * @param request HTTP ?붿껌
	 * @param encoding ?몄퐫??
	 * @return MultipartHttpServletRequest
	 * @throws MultipartException multipart ?뚯떛 以??ㅻ쪟 諛쒖깮 ??
	 */
	@Override
	public MultipartHttpServletRequest resolveMultipart(HttpServletRequest request) throws MultipartException {
		try {
			MultipartHttpServletRequest multipartRequest = super.resolveMultipart(request);
			
			// ?뚯씪 ?낅줈??蹂댁븞 寃利??섑뻾
			validateUploadedFiles(multipartRequest);
			
			return multipartRequest;
		} catch (MultipartException e) {
			LOGGER.error("Multipart parsing failed: {}", e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * ?낅줈?쒕맂 ?뚯씪?ㅼ쓽 蹂댁븞 寃利앹쓣 ?섑뻾?쒕떎.
	 * 
	 * @param multipartRequest MultipartHttpServletRequest
	 * @throws SecurityException 蹂댁븞 寃利??ㅽ뙣 ??
	 */
	private void validateUploadedFiles(MultipartHttpServletRequest multipartRequest) throws SecurityException {
		Map<String, List<MultipartFile>> fileMap = multipartRequest.getMultiFileMap();
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		
		// ?뚯씪 媛쒖닔 ?쒗븳 寃利?異붽?
		validateFileCount(multipartRequest);
		
		LOGGER.debug("File upload validation - Whitelist extensions: {}", whiteListFileUploadExtensions);
		
		for (Map.Entry<String, List<MultipartFile>> entry : fileMap.entrySet()) {
			String fieldName = entry.getKey();
			List<MultipartFile> files = entry.getValue();
			
			for (MultipartFile file : files) {
				if (file != null && !file.isEmpty()) {
					validateFile(file, whiteListFileUploadExtensions);
					LOGGER.debug("File validation passed for field [{}]: {} ({} bytes)", 
						fieldName, file.getOriginalFilename(), file.getSize());
				}
			}
		}
	}

	/**
	 * 媛쒕퀎 ?뚯씪??蹂댁븞 寃利앹쓣 ?섑뻾?쒕떎.
	 * 
	 * @param file 寃利앺븷 ?뚯씪
	 * @param whiteListFileUploadExtensions ?덉슜???뚯씪 ?뺤옣??紐⑸줉
	 * @throws SecurityException 蹂댁븞 寃利??ㅽ뙣 ??
	 */
	private void validateFile(MultipartFile file, String whiteListFileUploadExtensions) throws SecurityException {
		String fileName = file.getOriginalFilename();
		
		if (fileName == null || fileName.trim().isEmpty()) {
			LOGGER.warn("File name is null or empty");
			throw new SecurityException("File name is null or empty");
		}
		
		String fileExtension = EgovFileUploadUtil.getFileExtension(fileName);
		LOGGER.debug("Validating file: {} with extension: {}", fileName, fileExtension);
		
		// ?뺤옣?먭? ?녿뒗 寃쎌슦 泥섎━ 遺덇?
		if (fileExtension == null || fileExtension.trim().isEmpty()) {
			LOGGER.warn("File extension not found for file: {}", fileName);
			throw new SecurityException("[No file extension] File extension not allowed.");
		}
		
		// ?붿씠?몃━?ㅽ듃 寃利?
		if (whiteListFileUploadExtensions != null && !whiteListFileUploadExtensions.trim().isEmpty()) {
			String[] allowedExtensions = whiteListFileUploadExtensions.split(",");
			boolean isAllowed = false;
			
			for (String allowedExt : allowedExtensions) {
				String trimmedExt = allowedExt.trim().toLowerCase();
				// ??.)?쇰줈 ?쒖옉?섎뒗 寃쎌슦 ?쒓굅
				if (trimmedExt.startsWith(".")) {
					trimmedExt = trimmedExt.substring(1);
				}
				if (trimmedExt.equals(fileExtension.toLowerCase())) {
					isAllowed = true;
					break;
				}
			}
			
			if (!isAllowed) {
				LOGGER.warn("File extension [{}] not allowed for file: {}", fileExtension, fileName);
				throw new SecurityException("[" + fileExtension + "] File extension not allowed.");
			}
		} else {
			LOGGER.debug("No file extension whitelist configured, allowing all extensions");
		}
		
		// ?뚯씪 ?ш린 寃利?(湲곕낯媛? 10MB)
		long maxFileSize = getMaxFileSize();
		if (file.getSize() > maxFileSize) {
			LOGGER.warn("File size [{}] exceeds maximum allowed size [{}] for file: {}", 
				file.getSize(), maxFileSize, fileName);
			throw new SecurityException("File size exceeds maximum allowed size.");
		}
	}

	/**
	 * ?뚯씪 媛쒖닔 ?쒗븳??寃利앺븳??
	 * 
	 * @param multipartRequest MultipartHttpServletRequest
	 * @throws SecurityException ?뚯씪 媛쒖닔 ?쒗븳 珥덇낵 ??
	 */
	private void validateFileCount(MultipartHttpServletRequest multipartRequest) throws SecurityException {
		Map<String, List<MultipartFile>> fileMap = multipartRequest.getMultiFileMap();
		int totalFileCount = 0;
		
		// ?ㅼ젣 ?뚯씪???낅줈?쒕맂 媛쒖닔留?怨꾩궛 (鍮??뚯씪 ?쒖쇅)
		for (List<MultipartFile> files : fileMap.values()) {
			for (MultipartFile file : files) {
				if (file != null && !file.isEmpty()) {
					totalFileCount++;
				}
			}
		}
		
		int maxFileCount = getMaxFileCount();
		if (totalFileCount > maxFileCount) {
			LOGGER.warn("File count [{}] exceeds maximum allowed count [{}]", totalFileCount, maxFileCount);
			throw new SecurityException("File count exceeds maximum allowed count: " + totalFileCount + " > " + maxFileCount);
		}
		
		LOGGER.debug("File count validation passed: {} files (max: {})", totalFileCount, maxFileCount);
	}
	
	/**
	 * 理쒕? ?뚯씪 媛쒖닔瑜?諛섑솚?쒕떎.
	 * 
	 * @return 理쒕? ?뚯씪 媛쒖닔
	 */
	private int getMaxFileCount() {
		String maxFileCountStr = EgovProperties.getProperty("Globals.fileUpload.maxFileCount");
		if (StringUtils.hasText(maxFileCountStr)) {
			try {
				return Integer.parseInt(maxFileCountStr);
			} catch (NumberFormatException e) {
				LOGGER.warn("Invalid maxFileCount configuration: {}, using default", maxFileCountStr);
			}
		}
		// 湲곕낯媛? 10媛?(Tomcat 9.0.106+ 湲곕낯媛믨낵 ?숈씪)
		return 10;
	}

	/**
	 * 理쒕? ?뚯씪 ?ш린瑜?諛섑솚?쒕떎.
	 * 
	 * @return 理쒕? ?뚯씪 ?ш린 (諛붿씠??
	 */
	private long getMaxFileSize() {
		String maxFileSizeStr = EgovProperties.getProperty("Globals.fileUpload.maxFileSize");
		if (StringUtils.hasText(maxFileSizeStr)) {
			try {
				return Long.parseLong(maxFileSizeStr);
			} catch (NumberFormatException e) {
				LOGGER.warn("Invalid maxFileSize configuration: {}, using default", maxFileSizeStr);
			}
		}
		// 湲곕낯媛? 100MB (?섏젙??
		return 100 * 1024 * 1024;
	}

	/**
	 * multipart ?붿껌???꾨즺?????뺣━ ?묒뾽???섑뻾?쒕떎.
	 * 
	 * @param request HTTP ?붿껌
	 */
	@Override
	public void cleanupMultipart(MultipartHttpServletRequest request) {
		try {
			super.cleanupMultipart(request);
			LOGGER.debug("Multipart cleanup completed successfully");
		} catch (Exception e) {
			LOGGER.error("Error during multipart cleanup: {}", e.getMessage(), e);
		}
	}

	/**
	 * ?붿껌??multipart ?붿껌?몄? ?뺤씤?쒕떎.
	 * 
	 * @param request HTTP ?붿껌
	 * @return multipart ?붿껌 ?щ?
	 */
	@Override
	public boolean isMultipart(HttpServletRequest request) {
		boolean isMultipart = super.isMultipart(request);
		LOGGER.debug("Request isMultipart check result: {}", isMultipart);
		return isMultipart;
	}

}
