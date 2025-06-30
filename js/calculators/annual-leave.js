/* ==========================================
   연차계산기 모듈 (annual-leave.js)
   ========================================== */

/**
 * 연차계산기 클래스
 */
class AnnualLeaveCalculator {
    constructor() {
        this.usageCount = 1;
        this.totalAnnualLeave = 0;
        this.usedAnnualLeave = 0;
        this.remainingAnnualLeave = 0;
        this.serviceYears = 0;
        this.usageHistory = [];
        
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        this.updateRemoveButtons();
        this.trackPageView();
    }

    /**
     * 기본 날짜 설정
     */
    setDefaultDates() {
        const today = new Date();
        const currentDateInput = document.getElementById('currentDate');
        if (currentDateInput) {
            currentDateInput.value = CalculatorUtils.formatDateISO(today);
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 날짜 변경 이벤트
        this.addDateChangeListeners();
        
        // 근무형태 변경 이벤트
        const workTypeSelect = document.getElementById('workType');
        if (workTypeSelect) {
            workTypeSelect.addEventListener('change', this.handleWorkTypeChange.bind(this));
        }

        // 폼 제출 방지
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => e.preventDefault());
        }

        // 키보드 접근성
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('calc-btn')) {
                e.target.click();
            }
        });
    }

    /**
     * 페이지 뷰 추적
     */
    trackPageView() {
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackPageView('연차계산기', window.location.href);
        }
    }

    /**
     * 근무형태 변경 핸들러
     */
    handleWorkTypeChange(event) {
        const workType = event.target.value;
        const weeklyHoursGroup = document.getElementById('weeklyHours').closest('.form-group');
        
        if (workType === 'part-time') {
            weeklyHoursGroup.style.display = 'block';
            this.showWorkTypeInfo('시간제 근로자의 경우 주당 근무시간에 비례하여 연차가 발생합니다.', 'part-time');
        } else {
            weeklyHoursGroup.style.display = 'none';
            this.hideWorkTypeInfo();
        }

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('work_type_change', 'calculator', 'annual_leave', workType);
        }
    }

    /**
     * 근무형태 정보 표시
     */
    showWorkTypeInfo(message, type = 'default') {
        let infoBox = document.querySelector('.work-type-info');
        if (!infoBox) {
            infoBox = document.createElement('div');
            infoBox.className = 'work-type-info';
            const workTypeSelect = document.getElementById('workType');
            workTypeSelect.closest('.form-group').appendChild(infoBox);
        }
        
        infoBox.className = `work-type-info ${type}`;
        infoBox.textContent = message;
        infoBox.style.display = 'block';
    }

    /**
     * 근무형태 정보 숨김
     */
    hideWorkTypeInfo() {
        const infoBox = document.querySelector('.work-type-info');
        if (infoBox) {
            infoBox.style.display = 'none';
        }
    }

    /**
     * 연차 발생일수 계산
     */
    calculateAnnualLeave() {
        const hireDate = document.getElementById('hireDate').value;
        const currentDate = document.getElementById('currentDate').value;
        const workType = document.getElementById('workType').value;
        const weeklyHours = parseFloat(document.getElementById('weeklyHours').value) || 40;

        // 입력값 검증
        if (!hireDate || !currentDate) {
            UIComponents.showToast('입사일과 기준일을 모두 입력해주세요.', 'error');
            return;
        }

        const hireDateObj = new Date(hireDate);
        const currentDateObj = new Date(currentDate);

        if (hireDateObj > currentDateObj) {
            UIComponents.showToast('입사일이 기준일보다 늦을 수 없습니다.', 'error');
            return;
        }

        // 로딩 표시
        const resultContainer = document.getElementById('resultContainer');
        const loading = UIComponents.showLoading(resultContainer);

        setTimeout(() => {
            try {
                // 근속기간 계산
                this.serviceYears = this.calculateServiceYears(hireDateObj, currentDateObj);
                
                // 연차 발생일수 계산
                this.totalAnnualLeave = this.calculateTotalAnnualLeave(
                    hireDateObj, currentDateObj, workType, weeklyHours
                );

                // 결과 표시
                this.displayBasicResults();
                this.displayDetailInfo(hireDateObj, currentDateObj, workType, weeklyHours);
                this.showUsageSection();

                // 분석 이벤트 추적
                if (typeof calculatorPlatform !== 'undefined') {
                    calculatorPlatform.trackEvent('calculate_annual_leave', 'calculator', 'annual_leave', 
                        Math.round(this.totalAnnualLeave));
                }

                // 결과로 스크롤
                resultContainer.scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error('연차 계산 중 오류:', error);
                UIComponents.showToast('계산 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            } finally {
                UIComponents.hideLoading(resultContainer);
            }
        }, 300);
    }

    /**
     * 근속기간 계산 (년 단위)
     */
    calculateServiceYears(hireDate, currentDate) {
        const months = (currentDate.getFullYear() - hireDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - hireDate.getMonth());
        
        let adjustedMonths = months;
        if (currentDate.getDate() < hireDate.getDate()) {
            adjustedMonths--;
        }
        
        return Math.floor(adjustedMonths / 12);
    }

    /**
     * 총 연차 발생일수 계산
     */
    calculateTotalAnnualLeave(hireDate, currentDate, workType, weeklyHours) {
        const serviceYears = this.serviceYears;
        let annualLeave = 0;

        if (serviceYears === 0) {
            // 최초 1년: 1개월마다 1일씩 발생 (최대 11일)
            const serviceMonths = this.calculateServiceMonths(hireDate, currentDate);
            annualLeave = Math.min(serviceMonths, 11);
        } else {
            // 1년 이상: 기본 15일 + 3년마다 1일씩 추가 (최대 25일)
            annualLeave = 15;
            if (serviceYears >= 3) {
                const additionalDays = Math.floor((serviceYears - 1) / 2);
                annualLeave = Math.min(15 + additionalDays, 25);
            }
        }

        // 시간제 근로자 비례 계산
        if (workType === 'part-time' && weeklyHours < 40) {
            const ratio = weeklyHours / 40;
            annualLeave = Math.floor(annualLeave * ratio);
        }

        return annualLeave;
    }

    /**
     * 근속개월수 계산
     */
    calculateServiceMonths(hireDate, currentDate) {
        const months = (currentDate.getFullYear() - hireDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - hireDate.getMonth());
        
        if (currentDate.getDate() < hireDate.getDate()) {
            return Math.max(0, months - 1);
        }
        
        return Math.max(0, months);
    }

    /**
     * 기본 결과 표시
     */
    displayBasicResults() {
        const totalElement = document.getElementById('totalAnnualLeave');
        const serviceYearsElement = document.getElementById('serviceYears');
        const resultContainer = document.getElementById('resultContainer');
        const resultTitle = document.getElementById('result-title');

        if (totalElement) {
            totalElement.textContent = `${this.totalAnnualLeave}일`;
        }

        if (serviceYearsElement) {
            serviceYearsElement.textContent = `근속 ${this.serviceYears}년`;
        }

        if (resultContainer) {
            resultContainer.style.display = 'block';
            resultContainer.classList.add('show', 'fade-in-up');
        }

        if (resultTitle) {
            resultTitle.style.display = 'block';
        }

        // 접근성: 스크린 리더에 결과 알림
        this.announceToScreenReader(`연차 계산이 완료되었습니다. 총 발생 연차는 ${this.totalAnnualLeave}일입니다.`);
    }

    /**
     * 상세 정보 표시
     */
    displayDetailInfo(hireDate, currentDate, workType, weeklyHours) {
        const detailInfo = document.getElementById('detailInfo');
        const detailContent = document.getElementById('detailContent');

        if (!detailContent) return;

        const serviceYears = this.serviceYears;
        let detailHTML = '';

        // 근속기간 정보
        detailHTML += `<div class="timeline">`;
        
        // 입사일
        detailHTML += this.createTimelineItem(
            CalculatorUtils.formatDateKorean(hireDate),
            '입사일',
            'completed'
        );

        if (serviceYears === 0) {
            // 최초 1년차 정보
            const serviceMonths = this.calculateServiceMonths(hireDate, currentDate);
            detailHTML += this.createTimelineItem(
                `입사 후 ${serviceMonths}개월`,
                `연차 ${Math.min(serviceMonths, 11)}일 발생 (월 1일씩)`,
                'completed'
            );
            
            const nextYearDate = new Date(hireDate);
            nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
            detailHTML += this.createTimelineItem(
                CalculatorUtils.formatDateKorean(nextYearDate),
                '15일 연차 발생 예정 (근속 1년 도달)',
                'future'
            );
        } else {
            // 1년 이상 근속자 정보
            detailHTML += this.createTimelineItem(
                `근속 ${serviceYears}년`,
                `기본 15일 + 추가 ${Math.max(0, Math.min(Math.floor((serviceYears - 1) / 2), 10))}일 = ${this.totalAnnualLeave}일`,
                'completed'
            );

            if (this.totalAnnualLeave < 25) {
                const nextIncreaseYear = serviceYears + (2 - ((serviceYears - 1) % 2));
                detailHTML += this.createTimelineItem(
                    `근속 ${nextIncreaseYear}년`,
                    `연차 1일 추가 발생 예정 (${Math.min(this.totalAnnualLeave + 1, 25)}일)`,
                    'future'
                );
            }
        }

        detailHTML += `</div>`;

        // 시간제 근로자 정보
        if (workType === 'part-time') {
            detailHTML += `<div class="work-type-info part-time" style="margin-top: 20px;">
                <strong>시간제 근로 비례 계산:</strong><br>
                주 ${weeklyHours}시간 근무 (정규직 40시간 대비 ${Math.round((weeklyHours/40)*100)}%)
            </div>`;
        }

        detailContent.innerHTML = detailHTML;
        detailInfo.style.display = 'block';
    }

    /**
     * 타임라인 아이템 생성
     */
    createTimelineItem(date, description, status) {
        return `
            <div class="timeline-item ${status}">
                <div class="timeline-content ${status}">
                    <div class="timeline-date">${date}</div>
                    <div class="timeline-description">${description}</div>
                </div>
            </div>
        `;
    }

    /**
     * 연차 사용 섹션 표시
     */
    showUsageSection() {
        const usageSection = document.getElementById('usageSection');
        if (usageSection) {
            usageSection.style.display = 'block';
            usageSection.classList.add('fade-in-up');
        }
    }

    /**
     * 연차 사용 내역 추가
     */
    addUsage() {
        this.usageCount++;
        const container = document.getElementById('usageContainer');
        if (!container) {
            console.error('usageContainer 요소를 찾을 수 없습니다.');
            return;
        }

        const newUsage = this.createUsageElement(this.usageCount);
        container.appendChild(newUsage);
        this.updateRemoveButtons();

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('add_usage', 'calculator', 'annual_leave', this.usageCount);
        }

        // 새로 추가된 첫 번째 입력 필드로 포커스
        const firstInput = newUsage.querySelector('.usage-date');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * 연차 사용 요소 생성
     */
    createUsageElement(usageNumber) {
        const newUsage = document.createElement('div');
        newUsage.className = 'usage-group';
        newUsage.setAttribute('data-usage', usageNumber);
        newUsage.innerHTML = `
            <div class="form-group">
                <label for="usage-date-${usageNumber}">사용일</label>
                <input type="date" id="usage-date-${usageNumber}" class="usage-date" aria-describedby="usage-date-help">
            </div>
            <div class="form-group">
                <label for="usage-days-${usageNumber}">사용일수</label>
                <input type="number" id="usage-days-${usageNumber}" class="usage-days" min="0.5" max="30" step="0.5" placeholder="1" aria-describedby="usage-days-help">
            </div>
            <div class="form-group">
                <label for="usage-memo-${usageNumber}">메모 (선택)</label>
                <input type="text" id="usage-memo-${usageNumber}" class="usage-memo" placeholder="예: 개인사유, 가족여행 등" aria-describedby="usage-memo-help">
            </div>
            <button type="button" class="remove-usage-btn" onclick="annualLeaveCalc.removeUsage(this)" aria-label="${usageNumber}번째 연차 사용 내역 삭제">삭제</button>
        `;
        return newUsage;
    }

    /**
     * 연차 사용 내역 삭제
     */
    removeUsage(button) {
        if (!button) return;

        const usageGroup = button.closest('.usage-group');
        if (!usageGroup) return;

        // 확인 다이얼로그
        UIComponents.confirm(
            '이 연차 사용 내역을 삭제하시겠습니까?',
            () => {
                usageGroup.remove();
                this.updateUsageLabels();
                this.updateRemoveButtons();

                // 분석 이벤트 추적
                if (typeof calculatorPlatform !== 'undefined') {
                    calculatorPlatform.trackEvent('remove_usage', 'calculator', 'annual_leave');
                }
            }
        );
    }

    /**
     * 사용 내역 라벨 업데이트
     */
    updateUsageLabels() {
        const usageGroups = document.querySelectorAll('.usage-group');
        usageGroups.forEach((group, index) => {
            const usageNumber = index + 1;
            
            // ID 업데이트
            this.updateUsageIds(group, usageNumber);
            group.setAttribute('data-usage', usageNumber);
        });
        this.usageCount = usageGroups.length;
    }

    /**
     * 사용 내역별 ID 업데이트
     */
    updateUsageIds(group, usageNumber) {
        const dateInput = group.querySelector('.usage-date');
        const daysInput = group.querySelector('.usage-days');
        const memoInput = group.querySelector('.usage-memo');
        const removeBtn = group.querySelector('.remove-usage-btn');

        if (dateInput) {
            dateInput.id = `usage-date-${usageNumber}`;
            const dateLabel = group.querySelector('label[for^="usage-date"]');
            if (dateLabel) dateLabel.setAttribute('for', `usage-date-${usageNumber}`);
        }

        if (daysInput) {
            daysInput.id = `usage-days-${usageNumber}`;
            const daysLabel = group.querySelector('label[for^="usage-days"]');
            if (daysLabel) daysLabel.setAttribute('for', `usage-days-${usageNumber}`);
        }

        if (memoInput) {
            memoInput.id = `usage-memo-${usageNumber}`;
            const memoLabel = group.querySelector('label[for^="usage-memo"]');
            if (memoLabel) memoLabel.setAttribute('for', `usage-memo-${usageNumber}`);
        }

        if (removeBtn) {
            removeBtn.setAttribute('aria-label', `${usageNumber}번째 연차 사용 내역 삭제`);
        }
    }

    /**
     * 삭제 버튼 상태 업데이트
     */
    updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.remove-usage-btn');
        removeButtons.forEach(btn => {
            btn.style.display = this.usageCount > 1 ? 'block' : 'none';
        });
    }

    /**
     * 잔여 연차 계산
     */
    calculateRemaining() {
        if (this.totalAnnualLeave === 0) {
            UIComponents.showToast('먼저 연차 발생일수를 계산해주세요.', 'error');
            return;
        }

        const usageGroups = document.querySelectorAll('.usage-group');
        this.usageHistory = [];
        this.usedAnnualLeave = 0;

        // 연차 사용 내역 수집 및 검증
        let hasError = false;
        usageGroups.forEach((group, index) => {
            const dateInput = group.querySelector('.usage-date').value;
            const daysInput = parseFloat(group.querySelector('.usage-days').value) || 0;
            const memoInput = group.querySelector('.usage-memo').value.trim();

            if (dateInput && daysInput > 0) {
                if (daysInput > this.totalAnnualLeave) {
                    UIComponents.showToast(`${index + 1}번째 사용일수가 총 발생 연차를 초과합니다.`, 'error');
                    hasError = true;
                    return;
                }

                this.usageHistory.push({
                    date: dateInput,
                    days: daysInput,
                    memo: memoInput || '사유 없음'
                });
                this.usedAnnualLeave += daysInput;
            }
        });

        if (hasError) return;

        // 사용 연차 초과 검증
        if (this.usedAnnualLeave > this.totalAnnualLeave) {
            UIComponents.showToast(`총 사용 연차(${this.usedAnnualLeave}일)가 발생 연차(${this.totalAnnualLeave}일)를 초과합니다.`, 'error');
            return;
        }

        // 잔여 연차 계산
        this.remainingAnnualLeave = this.totalAnnualLeave - this.usedAnnualLeave;

        // 결과 업데이트
        this.updateRemainingResults();
        this.displayUsageHistory();
        this.showPlanningSection();

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('calculate_remaining', 'calculator', 'annual_leave', 
                Math.round(this.remainingAnnualLeave * 10));
        }

        UIComponents.showToast('잔여 연차 계산이 완료되었습니다.', 'success');
    }

    /**
     * 잔여 연차 결과 업데이트
     */
    updateRemainingResults() {
        const usedElement = document.getElementById('usedAnnualLeave');
        const remainingElement = document.getElementById('remainingAnnualLeave');
        const usageCountElement = document.getElementById('usageCount');
        const remainingStatusElement = document.getElementById('remainingStatus');

        if (usedElement) {
            usedElement.textContent = `${this.usedAnnualLeave}일`;
        }

        if (remainingElement) {
            remainingElement.textContent = `${this.remainingAnnualLeave}일`;
        }

        if (usageCountElement) {
            usageCountElement.textContent = `${this.usageHistory.length}건 사용`;
        }

        if (remainingStatusElement) {
            const usageRate = (this.usedAnnualLeave / this.totalAnnualLeave) * 100;
            if (usageRate === 0) {
                remainingStatusElement.textContent = '미사용';
            } else if (usageRate < 50) {
                remainingStatusElement.textContent = '충분함';
            } else if (usageRate < 80) {
                remainingStatusElement.textContent = '적당함';
            } else if (usageRate < 100) {
                remainingStatusElement.textContent = '부족함';
            } else {
                remainingStatusElement.textContent = '모두 사용';
            }
        }

        // 사용률 진행바 업데이트
        this.updateUsageProgressBar();
    }

    /**
     * 사용률 진행바 업데이트
     */
    updateUsageProgressBar() {
        const usageRate = (this.usedAnnualLeave / this.totalAnnualLeave) * 100;
        
        let progressHTML = `
            <div class="usage-progress">
                <div class="usage-progress-bar ${this.getProgressBarClass(usageRate)}" style="width: ${usageRate}%">
                    <div class="usage-progress-label">${Math.round(usageRate)}%</div>
                </div>
            </div>
        `;
        
        // 진행바를 잔여 연차 카드에 추가
        const remainingCard = document.querySelector('.result-card.warning');
        if (remainingCard) {
            let existingProgress = remainingCard.querySelector('.usage-progress');
            if (existingProgress) {
                existingProgress.remove();
            }
            remainingCard.insertAdjacentHTML('beforeend', progressHTML);
        }
    }

    /**
     * 진행바 클래스 결정
     */
    getProgressBarClass(usageRate) {
        if (usageRate < 50) return 'low';
        if (usageRate < 80) return 'medium';
        return 'high';
    }

    /**
     * 연차 사용 내역 표시
     */
    displayUsageHistory() {
        const usageHistory = document.getElementById('usageHistory');
        const usageList = document.getElementById('usageList');

        if (!usageList) return;

        if (this.usageHistory.length === 0) {
            usageHistory.style.display = 'none';
            return;
        }

        let historyHTML = `
            <table class="usage-table">
                <thead>
                    <tr>
                        <th>사용일</th>
                        <th>사용일수</th>
                        <th>메모</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // 날짜순 정렬
        const sortedHistory = this.usageHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedHistory.forEach(usage => {
            historyHTML += `
                <tr>
                    <td class="date-cell">${CalculatorUtils.formatDateKorean(new Date(usage.date))}</td>
                    <td class="days-cell">${usage.days}일</td>
                    <td class="memo-cell">${usage.memo}</td>
                </tr>
            `;
        });

        historyHTML += `
                </tbody>
            </table>
        `;

        usageList.innerHTML = historyHTML;
        usageHistory.style.display = 'block';
    }

    /**
     * 휴가 계획 섹션 표시
     */
    showPlanningSection() {
        const planningSection = document.getElementById('planningSection');
        if (planningSection && this.remainingAnnualLeave > 0) {
            planningSection.style.display = 'block';
            planningSection.classList.add('fade-in-up');
        }
    }

    /**
     * 휴가 계획 시뮬레이션
     */
    simulateVacation() {
        const planStartDate = document.getElementById('planStartDate').value;
        const planDays = parseFloat(document.getElementById('planDays').value) || 0;

        if (!planStartDate || planDays <= 0) {
            UIComponents.showToast('계획 시작일과 사용 예정 일수를 입력해주세요.', 'error');
            return;
        }

        if (planDays > this.remainingAnnualLeave) {
            UIComponents.showToast(`사용 예정 일수(${planDays}일)가 잔여 연차(${this.remainingAnnualLeave}일)를 초과합니다.`, 'error');
            return;
        }

        const startDate = new Date(planStartDate);
        const endDate = this.calculateVacationEndDate(startDate, planDays);
        const afterUsageRemaining = this.remainingAnnualLeave - planDays;

        this.displayPlanningResult(startDate, endDate, planDays, afterUsageRemaining);

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('simulate_vacation', 'calculator', 'annual_leave', Math.round(planDays * 10));
        }

        UIComponents.showToast('휴가 계획 시뮬레이션이 완료되었습니다.', 'success');
    }

    /**
     * 휴가 종료일 계산 (주말 제외)
     */
    calculateVacationEndDate(startDate, days) {
        const endDate = new Date(startDate);
        let remainingDays = days;
        
        while (remainingDays > 0) {
            // 주말이 아닌 경우만 차감
            if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
                remainingDays--;
            }
            if (remainingDays > 0) {
                endDate.setDate(endDate.getDate() + 1);
            }
        }
        
        return endDate;
    }

    /**
     * 휴가 계획 결과 표시
     */
    displayPlanningResult(startDate, endDate, planDays, afterUsageRemaining) {
        const planningResult = document.getElementById('planningResult');
        const planningContent = document.getElementById('planningContent');

        if (!planningContent) return;

        const workingDays = this.calculateWorkingDays(startDate, endDate);
        const totalCalendarDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        let resultHTML = `
            <div class="vacation-calendar">
                <div class="vacation-summary">
                    <div class="vacation-item">
                        <h4>휴가 시작일</h4>
                        <div class="value">${CalculatorUtils.formatDateKorean(startDate)}</div>
                    </div>
                    <div class="vacation-item">
                        <h4>휴가 종료일</h4>
                        <div class="value">${CalculatorUtils.formatDateKorean(endDate)}</div>
                    </div>
                    <div class="vacation-item">
                        <h4>연차 사용일수</h4>
                        <div class="value">${planDays}일</div>
                    </div>
                    <div class="vacation-item">
                        <h4>총 휴가일수</h4>
                        <div class="value">${totalCalendarDays}일</div>
                    </div>
                </div>
                
                <div class="detail-box">
                    <p><strong>📅 휴가 기간:</strong> ${CalculatorUtils.formatDateKorean(startDate)} ~ ${CalculatorUtils.formatDateKorean(endDate)}</p>
                    <p><strong>📊 연차 사용:</strong> ${planDays}일 (잔여: ${this.remainingAnnualLeave}일 → ${afterUsageRemaining}일)</p>
                    <p><strong>📆 실제 휴무:</strong> ${totalCalendarDays}일 (주말 포함)</p>
                    ${afterUsageRemaining <= 0 ? 
                        '<p style="color: #e53e3e;"><strong>⚠️ 주의:</strong> 연차를 모두 사용하게 됩니다.</p>' : 
                        `<p style="color: #38a169;"><strong>✅ 안전:</strong> 사용 후에도 ${afterUsageRemaining}일의 연차가 남습니다.</p>`
                    }
                </div>
            </div>
        `;

        planningContent.innerHTML = resultHTML;
        planningResult.style.display = 'block';
    }

    /**
     * 평일 계산 (주말 제외)
     */
    calculateWorkingDays(startDate, endDate) {
        let workingDays = 0;
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 일요일(0), 토요일(6) 제외
                workingDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return workingDays;
    }

    /**
     * 날짜 변경 이벤트 리스너 추가
     */
    addDateChangeListeners() {
        const hireDateInput = document.getElementById('hireDate');
        const currentDateInput = document.getElementById('currentDate');
        
        if (hireDateInput && currentDateInput) {
            hireDateInput.addEventListener('change', this.handleDateChange.bind(this));
            currentDateInput.addEventListener('change', this.handleDateChange.bind(this));
        }
    }

    /**
     * 날짜 변경 핸들러
     */
    handleDateChange(event) {
        try {
            const hireDate = document.getElementById('hireDate').value;
            const currentDate = document.getElementById('currentDate').value;
            
            if (hireDate && currentDate) {
                const hireDateObj = new Date(hireDate);
                const currentDateObj = new Date(currentDate);
                
                if (hireDateObj > currentDateObj) {
                    UIComponents.showToast('입사일이 기준일보다 늦을 수 없습니다.', 'error');
                    event.target.classList.add('error');
                    
                    setTimeout(() => {
                        event.target.classList.remove('error');
                    }, 3000);
                    return;
                }
            }
        } catch (error) {
            console.error('날짜 변경 처리 중 오류:', error);
        }
    }

    /**
     * 스크린 리더 알림
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * 데이터 내보내기 (선택사항)
     */
    exportData() {
        const data = {
            calculationType: 'annual_leave',
            hireDate: document.getElementById('hireDate').value,
            currentDate: document.getElementById('currentDate').value,
            workType: document.getElementById('workType').value,
            weeklyHours: document.getElementById('weeklyHours').value,
            totalAnnualLeave: this.totalAnnualLeave,
            serviceYears: this.serviceYears,
            usageHistory: this.usageHistory,
            usedAnnualLeave: this.usedAnnualLeave,
            remainingAnnualLeave: this.remainingAnnualLeave,
            calculatedAt: new Date().toISOString(),
            url: window.location.href
        };

        return data;
    }

    /**
     * 데이터 가져오기 (선택사항)
     */
    importData(data) {
        if (!data || data.calculationType !== 'annual_leave') return false;

        try {
            // 기본 정보 설정
            if (data.hireDate) document.getElementById('hireDate').value = data.hireDate;
            if (data.currentDate) document.getElementById('currentDate').value = data.currentDate;
            if (data.workType) document.getElementById('workType').value = data.workType;
            if (data.weeklyHours) document.getElementById('weeklyHours').value = data.weeklyHours;

            // 계산된 값 복원
            this.totalAnnualLeave = data.totalAnnualLeave || 0;
            this.serviceYears = data.serviceYears || 0;
            this.usageHistory = data.usageHistory || [];
            this.usedAnnualLeave = data.usedAnnualLeave || 0;
            this.remainingAnnualLeave = data.remainingAnnualLeave || 0;

            // 연차 사용 내역 복원
            if (data.usageHistory && data.usageHistory.length > 0) {
                const container = document.getElementById('usageContainer');
                container.innerHTML = '';
                this.usageCount = 0;

                data.usageHistory.forEach((usage, index) => {
                    if (index === 0) {
                        this.usageCount = 1;
                        const firstUsage = this.createUsageElement(1);
                        container.appendChild(firstUsage);
                    } else {
                        this.addUsage();
                    }

                    const currentUsage = container.children[index];
                    currentUsage.querySelector('.usage-date').value = usage.date;
                    currentUsage.querySelector('.usage-days').value = usage.days;
                    currentUsage.querySelector('.usage-memo').value = usage.memo;
                });
            }

            UIComponents.showToast('데이터를 성공적으로 불러왔습니다.', 'success');
            return true;
        } catch (error) {
            console.error('데이터 가져오기 오류:', error);
            UIComponents.showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    /**
     * 결과 초기화
     */
    resetResults() {
        this.totalAnnualLeave = 0;
        this.usedAnnualLeave = 0;
        this.remainingAnnualLeave = 0;
        this.serviceYears = 0;
        this.usageHistory = [];

        // UI 초기화
        const resultContainer = document.getElementById('resultContainer');
        const usageSection = document.getElementById('usageSection');
        const planningSection = document.getElementById('planningSection');

        if (resultContainer) resultContainer.style.display = 'none';
        if (usageSection) usageSection.style.display = 'none';
        if (planningSection) planningSection.style.display = 'none';

        // 연차 사용 내역 초기화
        const container = document.getElementById('usageContainer');
        if (container) {
            container.innerHTML = '';
            this.usageCount = 1;
            const firstUsage = this.createUsageElement(1);
            container.appendChild(firstUsage);
            this.updateRemoveButtons();
        }
    }
}

// 전역 인스턴스 생성
let annualLeaveCalc;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    annualLeaveCalc = new AnnualLeaveCalculator();
    
    // 전역 함수 바인딩 (하위 호환성)
    window.calculateAnnualLeave = () => annualLeaveCalc.calculateAnnualLeave();
    window.addUsage = () => annualLeaveCalc.addUsage();
    window.removeUsage = (button) => annualLeaveCalc.removeUsage(button);
    window.calculateRemaining = () => annualLeaveCalc.calculateRemaining();
    window.simulateVacation = () => annualLeaveCalc.simulateVacation();
});

// 모듈 노출
window.AnnualLeaveCalculator = AnnualLeaveCalculator;