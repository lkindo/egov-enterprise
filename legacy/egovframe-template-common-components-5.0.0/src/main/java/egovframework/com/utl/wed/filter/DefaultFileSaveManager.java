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

import java.io.File;
import java.io.IOException;

import org.apache.commons.fileupload2.core.FileItem;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.EgovProperties;

/**
 * Created by guava on 1/20/14.
 *  ?대?吏 ???泥섎━ ?대옒??
 * @author guavatak
 * @since 2014.12.04
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??             ?섏젙??            ?섏젙?댁슜
 *  ----------  --------    ---------------------------
 *  2014.12.04	?쒖??꾨젅?꾩썙??理쒖큹 ?곸슜 (?⑦궎吏 蹂寃?諛??뚯뒪 ?뺣━)
 *  2018.12.28	?좎슜??            saveFile() ?뚮씪誘명꽣 ?섏젙
 *  2023.12.20  ?좎슜??        CK-Editor ?낅줈???ㅻ쪟 ?섏젙
 * </pre>
 */
public class DefaultFileSaveManager implements FileSaveManager {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovProperties.class);

	@Override
	public String saveFile(FileItem fileItem, String imageBaseDir) {
		String originalFileName = FilenameUtils.getName(fileItem.getName());
		String relUrl;
		// filename
		String subDir = File.separator + DirectoryPathManager.getDirectoryPathByDateType(DirectoryPathManager.DIR_DATE_TYPE.DATE_POLICY_YYYY_MM);
		String fileName = RandomStringUtils.randomAlphanumeric(20) + "." + StringUtils.lowerCase(StringUtils.substringAfterLast(originalFileName, "."));
		String saveFileName = fileName+"_upfile";

		File fileToSave = DirectoryPathManager.getUniqueFile(imageBaseDir, subDir, saveFileName);

		try {
			FileUtils.writeByteArrayToFile(fileToSave, fileItem.get());
		} catch (IOException e) {
			//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.debug("File IO exception" + e.getMessage());
		}

		relUrl = StringUtils.replace(subDir, "\\", "/") + fileName;

		return relUrl;
	}
}
