package egovframework.com.cmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovFileMngServiceImpl.java
 * @Description : ?뚯씪?뺣낫??愿由щ? ?꾪븳 援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 25.     ?댁궪??   理쒖큹?앹꽦
 *    2024.10.29.	LeeBaekHaeng	@Override ?쒓린
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 25.
 * @version
 * @see
 *
 */
@Service("EgovFileMngService")
public class EgovFileMngServiceImpl extends EgovAbstractServiceImpl implements EgovFileMngService {

	@Resource(name = "FileManageDAO")
	private FileManageDAO fileMngDAO;

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪????젣?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInfs(java.util.List)
	 */
	@Override
	public void deleteFileInfs(List<FileVO> fvoList) throws Exception {
		fileMngDAO.deleteFileInfs(fvoList);
	}

	/**
	 * ?섎굹???뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInf(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public String insertFileInf(FileVO fvo) throws Exception {
		String atchFileId = fvo.getAtchFileId();

		fileMngDAO.insertFileInf(fvo);

		return atchFileId;
	}

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInfs(java.util.List)
	 */
	@Override
	public String insertFileInfs(List<FileVO> fvoList) throws Exception {
		String atchFileId = "";

		if (fvoList.size() != 0) {
			atchFileId = fileMngDAO.insertFileInfs(fvoList);
		}
		if (atchFileId == "") {
			atchFileId = null;
		}
		return atchFileId;
	}

	/**
	 * ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInfs(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public List<FileVO> selectFileInfs(FileVO fvo) throws Exception {
		return fileMngDAO.selectFileInfs(fvo);
	}

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??섏젙?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#updateFileInfs(java.util.List)
	 */
	@Override
	public void updateFileInfs(List<FileVO> fvoList) throws Exception {
		//Delete & Insert
		fileMngDAO.updateFileInfs(fvoList);
	}

	/**
	 * ?섎굹???뚯씪????젣?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInf(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public void deleteFileInf(FileVO fvo) throws Exception {
		fileMngDAO.deleteFileInf(fvo);
	}

	/**
	 * ?뚯씪??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInf(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public FileVO selectFileInf(FileVO fvo) throws Exception {
		return fileMngDAO.selectFileInf(fvo);
	}

	/**
	 * ?뚯씪 援щ텇?먯뿉 ???理쒕?媛믪쓣 援ы븳??
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#getMaxFileSN(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public int getMaxFileSN(FileVO fvo) throws Exception {
		return fileMngDAO.getMaxFileSN(fvo);
	}

	/**
	 * ?꾩껜 ?뚯씪????젣?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#deleteAllFileInf(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public void deleteAllFileInf(FileVO fvo) throws Exception {
		fileMngDAO.deleteAllFileInf(fvo);
	}

	/**
	 * ?뚯씪紐?寃?됱뿉 ???紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#selectFileListByFileNm(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public Map<String, Object> selectFileListByFileNm(FileVO fvo) throws Exception {
		List<FileVO> result = fileMngDAO.selectFileListByFileNm(fvo);
		int cnt = fileMngDAO.selectFileListCntByFileNm(fvo);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?대?吏 ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cmm.service.EgovFileMngService#selectImageFileList(egovframework.com.cmm.service.FileVO)
	 */
	@Override
	public List<FileVO> selectImageFileList(FileVO vo) throws Exception {
		return fileMngDAO.selectImageFileList(vo);
	}
}
