package egovframework.com.utl.sys.srm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrng;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrngVO;

/**
 * 媛쒖슂
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?ㅼ쟾 11:24:00
 */
@Repository("serverResrceMntrngDAO")
public class ServerResrceMntrngDAO extends EgovComAbstractDAO {

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return List - ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇 紐⑸줉
	 */
	public List<ServerResrceMntrngVO> selectServerResrceMntrngList(ServerResrceMntrngVO serverResrceMntrngVO)throws Exception {
		return selectList("serverResrceMntrngDAO.selectServerResrceMntrngList", serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return int - ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇 移댁슫????
	 */
	public int selectServerResrceMntrngListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return (Integer)selectOne("serverResrceMntrngDAO.selectServerResrceMntrngListTotCnt", serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return ServerResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 */
	public ServerResrceMntrngVO selectServerResrceMntrng(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return (ServerResrceMntrngVO) selectOne("serverResrceMntrngDAO.selectServerResrceMntrng", serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 濡쒓렇?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param serverResrceMntrng - ?쒕쾭?먯썝紐⑤땲?곕쭅 model
	 */
	public void insertServerResrceMntrng(ServerResrceMntrng serverResrceMntrng) throws Exception {
		insert("serverResrceMntrngDAO.insertServerResrceMntrng", serverResrceMntrng);
	}

	/**
	 * ?쒕쾭?먯썝紐⑦떚?덈쭅 ??곸꽌踰꾩쓽 紐⑸줉??議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return ServerResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 */
	public List<ServerResrceMntrngVO> selectMntrngServerList(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return selectList("serverResrceMntrngDAO.selectMntrngServerList", serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑦떚?덈쭅 ??곸꽌踰?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return int - ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇 移댁슫????
	 */
	public int selectMntrngServerListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return (Integer)selectOne("serverResrceMntrngDAO.selectMntrngServerListTotCnt", serverResrceMntrngVO);
	}
}