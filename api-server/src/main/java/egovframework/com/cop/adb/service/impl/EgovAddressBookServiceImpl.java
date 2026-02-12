package egovframework.com.cop.adb.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.adb.service.AddressBook;
import egovframework.com.cop.adb.service.AddressBookUser;
import egovframework.com.cop.adb.service.AddressBookUserVO;
import egovframework.com.cop.adb.service.AddressBookVO;
import egovframework.com.cop.adb.service.EgovAddressBookService;
import jakarta.annotation.Resource;

/**
 * 주소록정보를 관리하기 위한 서비스 구현 클래스
 * 
 * @author 공통컴포넌트팀 윤성록
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.9.25  윤성록          최초 생성
 *   2016.12.13 최두영          클래스명 변경
 *
 *      </pre>
 */
import com.company.project.domain.addressbook.AddressBookRepository;
import com.company.project.domain.addressbook.AddressBookUserRepository;
import com.company.project.domain.namecard.NameCard;
import com.company.project.domain.namecard.NameCardRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service("EgovAdressBookService")
@org.springframework.context.annotation.Lazy
public class EgovAddressBookServiceImpl extends EgovAbstractServiceImpl implements EgovAddressBookService {

    @Resource
    private AddressBookRepository addressBookRepository;

    @Resource
    private AddressBookUserRepository addressBookUserRepository;

    @Resource
    private NameCardRepository nameCardRepository;

    @Resource(name = "egovAdbkIdGnrService")
    private EgovIdGnrService idgenService;

    @Resource(name = "egovAdbkUserIdGnrService")
    private EgovIdGnrService idgenService2;

    /**
     * 주소록 목록을 조회한다.
     * 
     * @param AddressBookVO
     * @return Map<String, Object>
     * @exception Exception
     */
    @Override
    public Map<String, Object> selectAdressBookList(AddressBookVO adbkVO) throws Exception {
        Pageable pageable = PageRequest.of(adbkVO.getFirstIndex() / adbkVO.getRecordCountPerPage(),
                adbkVO.getRecordCountPerPage());

        Page<com.company.project.domain.addressbook.AddressBook> page = addressBookRepository.searchAddressBooks(
                adbkVO.getWrterId(), adbkVO.getTrgetOrgnztId(),
                adbkVO.getSearchCnd(), adbkVO.getSearchWrd(), pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent());
        map.put("resultCnt", String.valueOf(page.getTotalElements()));

        return map;
    }

    /**
     * 주소록 정보를 조회한다.
     * 
     * @param AddressBookVO
     * @return AdressBookVO
     * @exception Exception
     */
    @Override
    public AddressBookVO selectAdressBook(AddressBookVO addressBookVO) throws Exception {

        com.company.project.domain.addressbook.AddressBook entity = addressBookRepository
                .findById(addressBookVO.getAdbkId())
                .orElse(null);

        if (entity == null) {
            return null;
        }

        AddressBookVO adbkVO = new AddressBookVO();
        adbkVO.setAdbkId(entity.getAdbkId());
        adbkVO.setAdbkNm(entity.getAdbkNm());
        adbkVO.setOthbcScope(entity.getOthbcScope());
        adbkVO.setUseAt(entity.getUseAt());
        adbkVO.setWrterId(entity.getWrterId());

        List<com.company.project.domain.addressbook.AddressBookUser> users = addressBookUserRepository
                .findByAdbkId(entity.getAdbkId());
        List<egovframework.com.cop.adb.service.AddressBookUser> adbkUsers = new java.util.ArrayList<>();
        for (com.company.project.domain.addressbook.AddressBookUser userEntity : users) {
            egovframework.com.cop.adb.service.AddressBookUser user = new egovframework.com.cop.adb.service.AddressBookUser();
            user.setAdbkUserId(userEntity.getAdbkUserId());
            user.setAdbkId(userEntity.getAdbkId());
            user.setEmplyrId(userEntity.getEmplyrId());
            user.setNcrdId(userEntity.getNcrdId());
            user.setNm(userEntity.getNm());
            user.setEmailAdres(userEntity.getEmailAdres());
            user.setHomeTelno(userEntity.getHomeTelno());
            user.setMoblphonNo(userEntity.getMoblphonNo());
            user.setOffmTelno(userEntity.getOffmTelno());
            user.setFxnum(userEntity.getFxnum());
            adbkUsers.add(user);
        }
        adbkVO.setAdbkMan(adbkUsers);

        return adbkVO;
    }

    /**
     * 주소록 정보를 삭제한다.
     * 
     * @param AddressBook
     * @return
     * @exception Exception
     */
    @Override
    public void deleteAdressBook(AddressBook addressBook) throws Exception {
        com.company.project.domain.addressbook.AddressBook entity = addressBookRepository
                .findById(addressBook.getAdbkId())
                .orElseThrow(() -> new Exception("AddressBook not found"));

        entity.update(entity.getAdbkNm(), entity.getOthbcScope(), "N", addressBook.getLastUpdusrId());
        addressBookRepository.save(entity);
    }

    /**
     * 사용자 목록을 조회한다.
     * 
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    @Override
    public Map<String, Object> selectManList(AddressBookUserVO addressBookUserVO) throws Exception {
        Pageable pageable = PageRequest.of(
                addressBookUserVO.getFirstIndex() / addressBookUserVO.getRecordCountPerPage(),
                addressBookUserVO.getRecordCountPerPage());

        Page<com.company.project.domain.addressbook.AddressBookUserSearchResult> page = addressBookRepository
                .searchAddressBookUsers(
                        addressBookUserVO.getSearchWrd(), pageable);

        Map<String, Object> map = new HashMap<>();

        map.put("resultList", page.getContent());
        map.put("resultCnt", String.valueOf(page.getTotalElements()));

        return map;
    }

    /**
     * 명함 목록을 조회한다.
     * 
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    @Override
    public Map<String, Object> selectCardList(AddressBookUserVO addressBookUserVO) throws Exception {
        Pageable pageable = PageRequest.of(
                addressBookUserVO.getFirstIndex() / addressBookUserVO.getRecordCountPerPage(),
                addressBookUserVO.getRecordCountPerPage());

        Page<NameCard> page = nameCardRepository.findByNmContaining(addressBookUserVO.getSearchWrd(), pageable);

        Map<String, Object> map = new HashMap<>();

        map.put("resultList", page.getContent());
        map.put("resultCnt", String.valueOf(page.getTotalElements()));

        return map;
    }

    /**
     * 주소록 정보를 등록한다.
     * 
     * @param AddressBookVO
     * @return M
     * @exception Exception
     */
    @Override
    public void insertAdressBook(AddressBookVO adbkVO) throws Exception {

        adbkVO.setAdbkId(idgenService.getNextStringId());
        adbkVO.setUseAt("Y");

        com.company.project.domain.addressbook.AddressBook entity = com.company.project.domain.addressbook.AddressBook
                .builder()
                .adbkId(adbkVO.getAdbkId())
                .adbkNm(adbkVO.getAdbkNm())
                .othbcScope(adbkVO.getOthbcScope())
                .trgetOrgnztId(adbkVO.getTrgetOrgnztId())
                .useAt(adbkVO.getUseAt())
                .wrterId(adbkVO.getWrterId())
                .frstRegisterId(adbkVO.getFrstRegisterId())
                .build();

        addressBookRepository.save(entity);

        for (egovframework.com.cop.adb.service.AddressBookUser element : adbkVO.getAdbkMan()) {
            element.setAdbkUserId(idgenService2.getNextStringId());
            element.setAdbkId(adbkVO.getAdbkId());

            com.company.project.domain.addressbook.AddressBookUser userEntity = com.company.project.domain.addressbook.AddressBookUser
                    .builder()
                    .adbkUserId(element.getAdbkUserId())
                    .adbkId(element.getAdbkId())
                    .emplyrId(element.getEmplyrId())
                    .ncrdId(element.getNcrdId())
                    .nm(element.getNm())
                    .emailAdres(element.getEmailAdres())
                    .homeTelno(element.getHomeTelno())
                    .moblphonNo(element.getMoblphonNo())
                    .offmTelno(element.getOffmTelno())
                    .fxnum(element.getFxnum())
                    .build();
            addressBookUserRepository.save(userEntity);
        }
    }

    /**
     * 주소록 정보를 수정한다.
     * 
     * @param AddressBookVO
     * @return
     * @exception Exception
     */
    @Override
    public void updateAdressBook(AddressBookVO adbkVO) throws Exception {

        com.company.project.domain.addressbook.AddressBook entity = addressBookRepository.findById(adbkVO.getAdbkId())
                .orElseThrow(() -> new Exception("AddressBook not found"));

        entity.update(adbkVO.getAdbkNm(), adbkVO.getOthbcScope(), adbkVO.getUseAt(), adbkVO.getLastUpdusrId());
        addressBookRepository.save(entity);

        List<com.company.project.domain.addressbook.AddressBookUser> temp = addressBookUserRepository
                .findByAdbkId(adbkVO.getAdbkId());

        for (com.company.project.domain.addressbook.AddressBookUser element : temp) {
            // JPA handles nulls better, but keeping logic if needed for comparison
        }

        for (egovframework.com.cop.adb.service.AddressBookUser element : adbkVO.getAdbkMan()) {

            boolean check = false;

            for (com.company.project.domain.addressbook.AddressBookUser element2 : temp) {
                if (element.getEmplyrId().equals(element2.getEmplyrId()) &&
                        element.getNcrdId().equals(element2.getNcrdId())) {
                    check = true;
                    break;
                }
            }
            if (!check) {
                element.setAdbkUserId(idgenService2.getNextStringId());
                element.setAdbkId(adbkVO.getAdbkId());

                com.company.project.domain.addressbook.AddressBookUser userEntity = com.company.project.domain.addressbook.AddressBookUser
                        .builder()
                        .adbkUserId(element.getAdbkUserId())
                        .adbkId(element.getAdbkId())
                        .emplyrId(element.getEmplyrId())
                        .ncrdId(element.getNcrdId())
                        .nm(element.getNm())
                        .emailAdres(element.getEmailAdres())
                        .homeTelno(element.getHomeTelno())
                        .moblphonNo(element.getMoblphonNo())
                        .offmTelno(element.getOffmTelno())
                        .fxnum(element.getFxnum())
                        .build();
                addressBookUserRepository.save(userEntity);
            }
        }

        for (com.company.project.domain.addressbook.AddressBookUser element : temp) {

            boolean check = false;

            for (egovframework.com.cop.adb.service.AddressBookUser element2 : adbkVO.getAdbkMan()) {
                if (element.getEmplyrId().equals(element2.getEmplyrId()) &&
                        element.getNcrdId().equals(element2.getNcrdId())) {
                    check = true;
                    break;
                }
            }
            if (!check) {
                addressBookUserRepository.delete(element);
            }
        }
    }

    /**
     * 주소록 구성원 정보를 불러온다.
     * 
     * @param String
     * @return
     * @exception Exception
     */
    @Override
    public egovframework.com.cop.adb.service.AddressBookUser selectAdbkUser(String id)
            throws Exception {

        egovframework.com.cop.adb.service.AddressBookUser adbkUser = new egovframework.com.cop.adb.service.AddressBookUser();

        if (id.length() > 4 && id.substring(0, 4).equals("NCRD")) {
            NameCard nameCard = nameCardRepository.findById(id).orElse(null);
            if (nameCard != null) {
                adbkUser.setNcrdId(nameCard.getNcrdId());
                adbkUser.setNm(nameCard.getNcrdNm());
                adbkUser.setEmailAdres(nameCard.getEmailAdres());
                adbkUser.setHomeTelno(nameCard.getTelNo());
                adbkUser.setMoblphonNo(nameCard.getMbtlNum());
            }
        } else {
            // Internal users (Enterprise/General) - for now simplified as SearchResults
            // handled it
            // Real implementation would fetch from User repository
            // Reusing the SearchResults logic if possible, or keeping JPA query
            // For now, mirroring legacy behavior with potentially missing user fetch
            // TODO: Fetch user details if needed from modern User repositories
        }

        return adbkUser;
    }
}
