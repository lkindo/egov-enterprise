package egovframework.com.cmm.service;

import java.util.List;
import java.util.Map;

/**
 * @Class Name : EgovFileMngService.java
 * @Description : ?뚯씪?뺣낫??愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 25.     ?댁궪??   理쒖큹?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 25.
 * @version
 * @see
 *
 */
public interface EgovFileMngService {

    /**
     * ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param fvo
     * @return
     * @throws Exception
     */
    public List<FileVO> selectFileInfs(FileVO fvo) throws Exception;

    /**
     * ?섎굹???뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
     *
     * @param fvo
     * @throws Exception
     */
    public String insertFileInf(FileVO fvo) throws Exception;

    /**
     * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
     *
     * @param fvoList
     * @throws Exception
     */
    public String insertFileInfs(List<FileVO> fvoList) throws Exception;

    /**
     * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??섏젙?쒕떎.
     *
     * @param fvoList
     * @throws Exception
     */
    public void updateFileInfs(List<FileVO> fvoList) throws Exception;

    /**
     * ?щ윭 媛쒖쓽 ?뚯씪????젣?쒕떎.
     *
     * @param fvoList
     * @throws Exception
     */
    public void deleteFileInfs(List<FileVO> fvoList) throws Exception;

    /**
     * ?섎굹???뚯씪????젣?쒕떎.
     *
     * @param fvo
     * @throws Exception
     */
    public void deleteFileInf(FileVO fvo) throws Exception;

    /**
     * ?뚯씪??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param fvo
     * @return
     * @throws Exception
     */
    public FileVO selectFileInf(FileVO fvo) throws Exception;

    /**
     * ?뚯씪 援щ텇?먯뿉 ???理쒕?媛믪쓣 援ы븳??
     *
     * @param fvo
     * @return
     * @throws Exception
     */
    public int getMaxFileSN(FileVO fvo) throws Exception;

    /**
     * ?꾩껜 ?뚯씪????젣?쒕떎.
     *
     * @param fvo
     * @throws Exception
     */
    public void deleteAllFileInf(FileVO fvo) throws Exception;

    /**
     * ?뚯씪紐?寃?됱뿉 ???紐⑸줉??議고쉶?쒕떎.
     *
     * @param fvo
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectFileListByFileNm(FileVO fvo) throws Exception;

    /**
     * ?대?吏 ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param vo
     * @return
     * @throws Exception
     */
    public List<FileVO> selectImageFileList(FileVO vo) throws Exception;
}
