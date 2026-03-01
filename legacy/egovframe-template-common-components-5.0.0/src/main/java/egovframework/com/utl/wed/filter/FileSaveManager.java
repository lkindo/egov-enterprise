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

import org.apache.commons.fileupload2.core.FileItem;

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
 * </pre>
 */
public interface FileSaveManager {
    /**
     *
     * @param fileItem
     * @param imageBaseDir 湲곕낯 ?대?吏 ????붾젆?좊━. ???붾젆?좊━ ?꾨옒濡?紐⑤뱺 ?뚯씪???ｌ뼱???섍퀬, ?대뜑瑜?援щ텇?섏뿬 ?ｌ뼱???쒕떎. ???뚮씪誘명꽣?먮뒗 留덉?留??붾젆?좊━ 援щ텇?먮뒗 ?ы븿?섏? ?딅뒗??
     * @return ?대?吏 ?뚯씪???≪꽭???????덈뒗 URL ??諛섑솚?쒕떎. 諛섑솚??URL ? ckeditor ?먭쾶 ?꾨떖?섏뼱 利됱떆 ?ъ슜??釉뚮씪?곗졇???대?吏媛 ?섑??섍쾶 ?쒕떎.
     */
    String saveFile(FileItem fileItem, String imageBaseDir);
}
