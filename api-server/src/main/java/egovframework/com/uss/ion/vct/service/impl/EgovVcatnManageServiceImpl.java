package egovframework.com.uss.ion.vct.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
// import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.VcatnManage;
import com.company.project.domain.notification.VcatnManageId;
import com.company.project.domain.notification.VcatnManageRepository;
import com.company.project.domain.vacation.AnnualLeave;
import com.company.project.domain.vacation.AnnualLeaveRepository;

import egovframework.com.uss.ion.vct.service.EgovVcatnManageService;
import egovframework.com.uss.ion.vct.service.VcatnManageVO;
import jakarta.annotation.Resource;

@Service("egovVcatnManageService")
public class EgovVcatnManageServiceImpl extends EgovAbstractServiceImpl implements EgovVcatnManageService {

	@Resource(name = "vcatnManageRepository")
	private VcatnManageRepository vcatnManageRepository;

	@Resource(name = "annualLeaveRepository")
	private AnnualLeaveRepository annualLeaveRepository;

	@Override
	public List<VcatnManageVO> selectVcatnManageList(VcatnManageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		return vcatnManageRepository.findAll(pageable).getContent().stream()
				.filter(e -> searchVO.getApplcntId().equals(e.getApplcntId()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectVcatnManageListTotCnt(VcatnManageVO searchVO) throws Exception {
		return (int) vcatnManageRepository.count();
	}

	@Override
	public VcatnManageVO selectVcatnManage(VcatnManageVO searchVO) throws Exception {
		VcatnManageId id = new VcatnManageId(searchVO.getApplcntId(), searchVO.getVcatnSe(), searchVO.getBgnde());
		return vcatnManageRepository.findById(id)
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public String insertVcatnManage(egovframework.com.uss.ion.vct.service.VcatnManage searchVO, VcatnManageVO vo)
			throws Exception {
		VcatnManage entity = VcatnManage.builder()
				.applcntId(searchVO.getApplcntId())
				.vcatnSe(searchVO.getVcatnSe())
				.bgnde(searchVO.getBgnde())
				.endde(searchVO.getEndde())
				.vcatnResn(searchVO.getVcatnResn())
				.reqstDe(searchVO.getReqstDe())
				.occrrncYear(searchVO.getOccrrncYear())
				.noonSe(searchVO.getNoonSe())
				.sanctnerId(searchVO.getSanctnerId())
				.confmAt(searchVO.getConfmAt())
				.infrmlSanctnId(searchVO.getInfrmlSanctnId())
				.frstRegisterId(searchVO.getFrstRegisterId())
				.build();
		vcatnManageRepository.save(entity);
		return "success";
	}

	@Override
	public String updtVcatnManage(egovframework.com.uss.ion.vct.service.VcatnManage searchVO, VcatnManageVO vo)
			throws Exception {
		VcatnManageId id = new VcatnManageId(searchVO.getApplcntId(), searchVO.getVcatnSe(), searchVO.getBgnde());
		vcatnManageRepository.findById(id).ifPresent(entity -> {
			entity.update(searchVO.getVcatnResn(), searchVO.getLastUpdusrId());
			vcatnManageRepository.save(entity);
		});
		return "success";
	}

	@Override
	public void deleteVcatnManage(egovframework.com.uss.ion.vct.service.VcatnManage searchVO) throws Exception {
		VcatnManageId id = new VcatnManageId(searchVO.getApplcntId(), searchVO.getVcatnSe(), searchVO.getBgnde());
		vcatnManageRepository.deleteById(id);
	}

	@Override
	public int selectVcatnManageDplctAt(VcatnManageVO searchVO) throws Exception {
		return 0;
	}

	@Override
	public List<VcatnManageVO> selectVcatnManageConfmList(VcatnManageVO searchVO) throws Exception {
		return vcatnManageRepository.findAll().stream()
				.filter(e -> searchVO.getSanctnerId().equals(e.getSanctnerId()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectVcatnManageConfmListTotCnt(VcatnManageVO searchVO) throws Exception {
		return (int) selectVcatnManageConfmList(searchVO).size();
	}

	@Override
	public void updtVcatnManageConfm(egovframework.com.uss.ion.vct.service.VcatnManage searchVO) throws Exception {
		VcatnManageId id = new VcatnManageId(searchVO.getApplcntId(), searchVO.getVcatnSe(), searchVO.getBgnde());
		vcatnManageRepository.findById(id).ifPresent(entity -> {
			entity.confirm(searchVO.getConfmAt(), LocalDateTime.now(), searchVO.getReturnResn(),
					searchVO.getLastUpdusrId());
			vcatnManageRepository.save(entity);
		});
	}

	@Override
	public VcatnManageVO selectIndvdlYrycManage(String sUsid) throws Exception {
		// Assuming current year for lookup
		String year = String.valueOf(LocalDateTime.now().getYear());
		return annualLeaveRepository.findById(new AnnualLeave.AnnualLeaveId(sUsid, year)).map(e -> {
			VcatnManageVO vo = new VcatnManageVO();
			vo.setOccrrncYear(e.getId().getOccrrncYear());
			vo.setUsid(e.getId().getUserId());
			vo.setOccrncYrycCo(e.getOccrncYrycCo());
			vo.setUseYrycCo(e.getUseYrycCo());
			vo.setRemndrYrycCo(e.getRemndrYrycCo());
			return vo;
		}).orElse(null);
	}

	@Override
	public void updtIndvdlYrycManage(egovframework.com.uss.ion.vct.service.IndvdlYrycManage searchVO)
			throws Exception {
		annualLeaveRepository.findById(new AnnualLeave.AnnualLeaveId(searchVO.getUsid(), searchVO.getOccrrncYear()))
				.ifPresent(entity -> {
					entity.updateUsage(searchVO.getUseYrycCo(), searchVO.getRemndrYrycCo(), searchVO.getLastUpdusrId());
					annualLeaveRepository.save(entity);
				});
	}

	private VcatnManageVO toVO(VcatnManage entity) {
		VcatnManageVO vo = new VcatnManageVO();
		vo.setApplcntId(entity.getApplcntId());
		vo.setVcatnSe(entity.getVcatnSe());
		vo.setBgnde(entity.getBgnde());
		vo.setEndde(entity.getEndde());
		vo.setVcatnResn(entity.getVcatnResn());
		vo.setReqstDe(entity.getReqstDe());
		vo.setOccrrncYear(entity.getOccrrncYear());
		vo.setNoonSe(entity.getNoonSe());
		vo.setSanctnerId(entity.getSanctnerId());
		vo.setConfmAt(entity.getConfmAt());
		if (entity.getSanctnDt() != null) {
			vo.setSanctnDt(entity.getSanctnDt().toString());
		}
		vo.setReturnResn(entity.getReturnResn());
		vo.setInfrmlSanctnId(entity.getInfrmlSanctnId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
