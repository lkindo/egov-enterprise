package egovframework.com.cmm.service.impl;

import java.util.Iterator;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.FileVO;

/**
 * @Class Name : EgovFileMngDAO.java
 * @Description : ?뚯씪?뺣낫 愿由щ? ?꾪븳 ?곗씠??泥섎━ ?대옒??
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
@Repository("FileManageDAO")
public class FileManageDAO extends EgovComAbstractDAO {

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
	 *
	 * @param fileList
	 * @return
	 * @throws Exception
	 */
	public String insertFileInfs(List<FileVO> fileList) throws Exception {
		FileVO vo = fileList.get(0);
		String atchFileId = vo.getAtchFileId();

		insert("FileManageDAO.insertFileMaster", vo);

		Iterator<FileVO> iter = fileList.iterator();
		while (iter.hasNext()) {
			vo = iter.next();

			insert("FileManageDAO.insertFileDetail", vo);
		}

		return atchFileId;
	}

	/**
	 * ?섎굹???뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??깅줉?쒕떎.
	 *
	 * @param vo
	 * @throws Exception
	 */
	public void insertFileInf(FileVO vo) throws Exception {
		insert("FileManageDAO.insertFileMaster", vo);
		insert("FileManageDAO.insertFileDetail", vo);
	}

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪??????뺣낫(?띿꽦 諛??곸꽭)瑜??섏젙?쒕떎.
	 *
	 * @param fileList
	 * @throws Exception
	 */
	public void updateFileInfs(List<FileVO> fileList) throws Exception {
		FileVO vo;
		Iterator<FileVO> iter = fileList.iterator();
		while (iter.hasNext()) {
			vo = iter.next();
			insert("FileManageDAO.insertFileDetail", vo);
		}
	}

	/**
	 * ?щ윭 媛쒖쓽 ?뚯씪????젣?쒕떎.
	 *
	 * @param fileList
	 * @throws Exception
	 */
	public void deleteFileInfs(List<FileVO> fileList) throws Exception {
		Iterator<FileVO> iter = fileList.iterator();
		FileVO vo;
		while (iter.hasNext()) {
			vo = iter.next();

			delete("FileManageDAO.deleteFileDetail", vo);
		}
	}

	/**
	 * ?섎굹???뚯씪????젣?쒕떎.
	 *
	 * @param fvo
	 * @throws Exception
	 */
	public void deleteFileInf(FileVO fvo) throws Exception {
		delete("FileManageDAO.deleteFileDetail", fvo);
	}

	/**
	 * ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param vo
	 * @return
	 * @throws Exception
	 */
	public List<FileVO> selectFileInfs(FileVO vo) throws Exception {
		return selectList("FileManageDAO.selectFileList", vo);
	}

	/**
	 * ?뚯씪 援щ텇?먯뿉 ???理쒕?媛믪쓣 援ы븳??
	 *
	 * @param fvo
	 * @return
	 * @throws Exception
	 */
	public int getMaxFileSN(FileVO fvo) throws Exception {
		return (Integer) selectOne("FileManageDAO.getMaxFileSN", fvo);
	}

	/**
	 * ?뚯씪??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param fvo
	 * @return
	 * @throws Exception
	 */
	public FileVO selectFileInf(FileVO fvo) throws Exception {
		return (FileVO) selectOne("FileManageDAO.selectFileInf", fvo);
	}

	/**
	 * ?꾩껜 ?뚯씪????젣?쒕떎.
	 *
	 * @param fvo
	 * @throws Exception
	 */
	public void deleteAllFileInf(FileVO fvo) throws Exception {
		update("FileManageDAO.deleteCOMTNFILE", fvo);
	}

	/**
	 * ?뚯씪紐?寃?됱뿉 ???紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param vo
	 * @return
	 * @throws Exception
	 */
	public List<FileVO> selectFileListByFileNm(FileVO fvo) throws Exception {
		return selectList("FileManageDAO.selectFileListByFileNm", fvo);
	}

	/**
	 * ?뚯씪紐?寃?됱뿉 ???紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 *
	 * @param fvo
	 * @return
	 * @throws Exception
	 */
	public int selectFileListCntByFileNm(FileVO fvo) throws Exception {
		return (Integer) selectOne("FileManageDAO.selectFileListCntByFileNm", fvo);
	}

	/**
	 * ?대?吏 ?뚯씪?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param vo
	 * @return
	 * @throws Exception
	 */
	public List<FileVO> selectImageFileList(FileVO vo) throws Exception {
		return selectList("FileManageDAO.selectImageFileList", vo);
	}
}
