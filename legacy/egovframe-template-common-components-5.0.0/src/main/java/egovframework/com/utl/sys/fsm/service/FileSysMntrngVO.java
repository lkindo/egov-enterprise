package egovframework.com.utl.sys.fsm.service;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓽 紐⑸줉 ??ぉ, 議고쉶議곌굔 ?깆쓣 愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@SuppressWarnings("serial")
public class FileSysMntrngVO extends FileSysMntrng {

	/** 寃?됱“嫄?*/
    private String searchCnd = "";

    /** 寃?됰떒??*/
    private String searchWrd = "";

    /** ?꾩옱?섏씠吏 */
    private int pageIndex = 1;

    /** ?섏씠吏媛쒖닔 */
    private int pageUnit = 10;

    /** ?섏씠吏?ъ씠利?*/
    private int pageSize = 10;

    /** 泥ロ럹?댁? ?몃뜳??*/
    private int firstIndex = 1;

    /** 留덉?留됲럹?댁? ?몃뜳??*/
    private int lastIndex = 1;

    /** ?섏씠吏???덉퐫??媛쒖닔 */
    private int recordCountPerPage = 10;
	/**
	 * 寃??議곌굔??媛?몄샃?덈떎.
	 */
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * 寃??議곌굔???ㅼ젙?⑸땲??
	 */
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * 寃?됱뼱瑜?媛?몄샃?덈떎.
	 */
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * 寃?됱뼱瑜??ㅼ젙?⑸땲??
	 */
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * ?꾩옱 ?섏씠吏 ?몃뜳?ㅻ? 媛?몄샃?덈떎.
	 */
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * ?꾩옱 ?섏씠吏 ?몃뜳?ㅻ? ?ㅼ젙?⑸땲??
	 */
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * ?섏씠吏 ?⑥쐞瑜?媛?몄샃?덈떎.
	 */
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * ?섏씠吏 ?⑥쐞瑜??ㅼ젙?⑸땲??
	 */
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * ???섏씠吏??理쒕? ?ш린瑜?媛?몄샃?덈떎.
	 */
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * ???섏씠吏??理쒕? ?ш린瑜??ㅼ젙?⑸땲??
	 */
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * ?섏씠吏 踰붿쐞 ?댁쓽 泥ル쾲吏??몃뜳?ㅻ? 媛?몄샃?덈떎.
	 */
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * ?섏씠吏 踰붿쐞 ?댁쓽 泥ル쾲吏??몃뜳?ㅻ? ?ㅼ젙?⑸땲??
	 */
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * ?섏씠吏 踰붿쐞 ?댁쓽 留덉?留??몃뜳?ㅻ? 媛?몄샃?덈떎.
	 */
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * ?섏씠吏 踰붿쐞 ?댁쓽 留덉?留??몃뜳?ㅻ? ?ㅼ젙?⑸땲??
	 */
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * ?섏씠吏??湲곕줉(?덉퐫?? ?섎? 媛?몄샃?덈떎.
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * ?섏씠吏??湲곕줉(?덉퐫?? ?섎? ?ㅼ젙?⑸땲??
	 */
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}


}
