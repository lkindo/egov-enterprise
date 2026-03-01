*
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
import java.util.Calendar;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import com.sun.star.auth.InvalidArgumentException;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;

/**
 *  ?대?吏 ???泥섎━ ?대옒??
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
 *  2014.12.04  ?쒖??꾨젅?꾩썙?? 理쒖큹 ?곸슜 (?⑦궎吏 蹂寃?諛??뚯뒪 ?뺣━)
 *  2018.12.28  ?좎슜??       getDirectoryPathByDateType() Month??踰붿쐞瑜?1~12媛 ?섎룄濡??섏젙
 *  2022.11.16  ?좎슜??       蹂댁븞肄붾뱶 ?먭? 諛??섏젙
 * 	2025.08.30  ?≫븯??       2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessarySemicolon(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 * </pre>
 */
public class DirectoryPathManager {

	private static String fileStorePath = EgovProperties.getProperty("Globals.fileStorePath");

	public enum DIR_DATE_TYPE {
		DATE_POLICY_YYYY_MM_DD, DATE_POLICY_YYYY_MM, DATE_POLICY_YYYY
	}

	/**
	 * 2012/12/22/
	 * @param dateType
	 * @return
	 * @throws InvalidArgumentException
	 */
	public static String getDirectoryPathByDateType(DIR_DATE_TYPE policy) {

		Calendar calendar = Calendar.getInstance();
		StringBuffer sb = new StringBuffer();
		sb.append(calendar.get(Calendar.YEAR)).append(File.separator);
		if (policy.ordinal() <= DIR_DATE_TYPE.DATE_POLICY_YYYY_MM.ordinal()) {
			sb.append(StringUtils.leftPad(String.valueOf(calendar.get(Calendar.MONTH)+1), 2, '0')).append(File.separator);
		}
		if (policy.ordinal() <= DIR_DATE_TYPE.DATE_POLICY_YYYY_MM_DD.ordinal()) {
			sb.append(StringUtils.leftPad(String.valueOf(calendar.get(Calendar.DATE)), 2, '0')).append(File.separator);
		}

		return sb.toString();
	}

	/**
	 * 二쇱뼱吏?湲곕낯 ?붾젆?곕━, ?섏쐞 ?붾젆?곕━ 諛??먮옒 ?뚯씪 ?대쫫?????怨좎쑀???뚯씪 ?대쫫???앹꽦?⑸땲??
	 * ??硫붿꽌?쒕뒗 二쇱뼱吏??대쫫??媛吏??뚯씪???대? 議댁옱?섎뒗 寃쎌슦 ?뚯씪??湲곕낯 ?대쫫???쒖감 踰덊샇瑜?異붽??섏뿬 ???대쫫???앹꽦?섎룄濡?蹂댁옣?⑸땲??
	 *
	 * @param imageBaseDir ?뚯씪????λ맆 ?덉젙??湲곕낯 ?붾젆?곕━.
	 * @param subDir 湲곕낯 ?붾젆?곕━ ?꾨옒???섏쐞 ?붾젆?곕━.
	 * @param fileName ?뚯씪???먮옒 ?대쫫.
	 * @return 怨좎쑀???뚯씪 寃쎈줈瑜?媛由ы궎??File 媛앹껜. 二쇱뼱吏??대쫫???뚯씪???대? 議댁옱?섎㈃, 湲곕낯 ?대쫫???レ옄瑜?異붽??섏뿬 怨좎쑀???뚯씪 ?대쫫???앹꽦?⑸땲??
	 */
	public static File getUniqueFile(String imageBaseDir, String subDir, String fileName) {

		File file = new File(fileStorePath + EgovWebUtil.filePathBlackList(imageBaseDir + subDir) + FilenameUtils.getName(fileName));

		if (!file.exists())
			return file;

		File tmpFile = new File(file.getAbsolutePath());
		File parentDir = tmpFile.getParentFile();
		int count = 1;
		String extension = FilenameUtils.getExtension(tmpFile.getName());
		String baseName = FilenameUtils.getBaseName(tmpFile.getName());
		do {
			tmpFile = new File(parentDir, baseName + "_" + count++ + "_." + extension);
		} while (tmpFile.exists());
		return tmpFile;
	}

}
