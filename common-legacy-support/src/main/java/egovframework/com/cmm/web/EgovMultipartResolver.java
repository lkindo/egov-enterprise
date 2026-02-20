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
 * ???????????????? ???????
 *
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *  ????               ????            ????
 *  ----------   --------    ---------------------------
 *  2009.03.25   ????             ????
 *  2011.06.11   ?????             ???3.0 ??????API??????
 *  2020.10.27   ???             ??????
 *  2020.10.29   ???             ????? ?? ????????? (globals.properties > Globals.fileUpload.Extensions)
 *  2025.07.01   ????           Spring Framework 6.2.8, JDK 17 ?? ????
 *
 *      </pre>
 **/
public class EgovMultipartResolver extends StandardServletMultipartResolver {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMultipartResolver.class);

	public EgovMultipartResolver() {
		super();
	}

	/**
	 * multipart ???????? ??? ???????????.
	 * 
	 * @param request HTTP ?
	 * @param encoding ???
	 * @return MultipartHttpServletRequest
	 * @throws MultipartException multipart ??? ??? ???
	 **/
	@Override
	public MultipartHttpServletRequest resolveMultipart(HttpServletRequest request) throws MultipartException {
		try {
			MultipartHttpServletRequest multipartRequest = super.resolveMultipart(request);
			
			// ??? ????????
			validateUploadedFiles(multipartRequest);
			
			return multipartRequest;
		} catch (MultipartException e) {
			LOGGER.error("Multipart parsing failed: {}", e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * ???? ????? ???????.
	 * 
	 * @param multipartRequest MultipartHttpServletRequest
	 * @throws SecurityException ???? ??
	 **/
	private void validateUploadedFiles(MultipartHttpServletRequest multipartRequest) throws SecurityException {
		Map<String, List<MultipartFile>> fileMap = multipartRequest.getMultiFileMap();
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		
		// ??? ???? ???
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
	 * ??????????????.
	 * 
	 * @param file ????
	 * @param whiteListFileUploadExtensions ??????? ????
	 * @throws SecurityException ???? ??
	 **/
	private void validateFile(MultipartFile file, String whiteListFileUploadExtensions) throws SecurityException {
		String fileName = file.getOriginalFilename();
		
		if (fileName == null || fileName.trim().isEmpty()) {
			LOGGER.warn("File name is null or empty");
			throw new SecurityException("File name is null or empty");
		}
		
		String fileExtension = EgovFileUploadUtil.getFileExtension(fileName);
		LOGGER.debug("Validating file: {} with extension: {}", fileName, fileExtension);
		
		// ??? ?? ??????
		if (fileExtension == null || fileExtension.trim().isEmpty()) {
			LOGGER.warn("File extension not found for file: {}", fileName);
			throw new SecurityException("[No file extension] File extension not allowed.");
		}
		
		// ???? ?
		if (whiteListFileUploadExtensions != null && !whiteListFileUploadExtensions.trim().isEmpty()) {
			String[] allowedExtensions = whiteListFileUploadExtensions.split(",");
			boolean isAllowed = false;
			
			for (String allowedExt : allowedExtensions) {
				String trimmedExt = allowedExt.trim().toLowerCase();
				// ??.)?? ???? ????
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
		
		// ??? ????(??? 10MB)
		long maxFileSize = getMaxFileSize();
		if (file.getSize() > maxFileSize) {
			LOGGER.warn("File size [{}] exceeds maximum allowed size [{}] for file: {}", 
				file.getSize(), maxFileSize, fileName);
			throw new SecurityException("File size exceeds maximum allowed size.");
		}
	}

	/**
	 * ??? ????????
	 * 
	 * @param multipartRequest MultipartHttpServletRequest
	 * @throws SecurityException ??? ???? ?????
	 **/
	private void validateFileCount(MultipartHttpServletRequest multipartRequest) throws SecurityException {
		Map<String, List<MultipartFile>> fileMap = multipartRequest.getMultiFileMap();
		int totalFileCount = 0;
		
		// ?? ????????? ????(????? ??)
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
	 * ? ??? ?????.
	 * 
	 * @return ? ??? ??
	 **/
	private int getMaxFileCount() {
		String maxFileCountStr = EgovProperties.getProperty("Globals.fileUpload.maxFileCount");
		if (StringUtils.hasText(maxFileCountStr)) {
			try {
				return Integer.parseInt(maxFileCountStr);
			} catch (NumberFormatException e) {
				LOGGER.warn("Invalid maxFileCount configuration: {}, using default", maxFileCountStr);
			}
		}
		// ??? 10?(Tomcat 9.0.106+ ?? ??)
		return 10;
	}

	/**
	 * ? ??? ??????.
	 * 
	 * @return ? ??? ???(???
	 **/
	private long getMaxFileSize() {
		String maxFileSizeStr = EgovProperties.getProperty("Globals.fileUpload.maxFileSize");
		if (StringUtils.hasText(maxFileSizeStr)) {
			try {
				return Long.parseLong(maxFileSizeStr);
			} catch (NumberFormatException e) {
				LOGGER.warn("Invalid maxFileSize configuration: {}, using default", maxFileSizeStr);
			}
		}
		// ??? 100MB (????
		return 100 * 1024 * 1024;
	}

	/**
	 * multipart ????????? ???????.
	 * 
	 * @param request HTTP ?
	 **/
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
	 * ???multipart ??? ???.
	 * 
	 * @param request HTTP ?
	 * @return multipart ? ???
	 **/
	@Override
	public boolean isMultipart(HttpServletRequest request) {
		boolean isMultipart = super.isMultipart(request);
		LOGGER.debug("Request isMultipart check result: {}", isMultipart);
		return isMultipart;
	}

}
