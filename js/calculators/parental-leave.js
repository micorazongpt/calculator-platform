/* ==========================================
   육아휴직 계산기 모듈 (parental-leave.js)
   ========================================== */

/**
 * 육아휴직 계산기 클래스
 */
class ParentalLeaveCalculator {
    constructor() {
        this.periodCount = 1;
        this.totalUsedMonths = 0;
        this.currentOverlapStatus = false;
        this.currentOverlapMessage = '';
        
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.setupEventListeners();
        this.updateRemoveButtons();
        this.trackPageView();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 날짜 변경 이벤트
        this.addDateChangeListeners();
        
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
            calculatorPlatform.trackPageView('육아휴직 계산기', window.location.href);
        }
    }

    /**
     * 기간 추가
     */
    addPeriod() {
        if (this.periodCount >= 3) {
            UIComponents.showToast('⚠️ 분할 사용은 법적으로 3회까지 허용됩니다. (참고용으로만 사용해주세요)', 'warning', 4000);
        }
        
        this.periodCount++;
        const container = document.getElementById('periodsContainer');
        if (!container) {
            console.error('periodsContainer 요소를 찾을 수 없습니다.');
            return;
        }
        
        const newPeriod = this.createPeriodElement(this.periodCount);
        container.appendChild(newPeriod);
        
        if (this.periodCount > 3) {
            this.markPeriodAsExceeded(newPeriod, this.periodCount);
        }
        
        this.updateRemoveButtons();
        this.addDateChangeListeners();

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('add_period', 'calculator', 'parental_leave', this.periodCount);
        }

        // 새로 추가된 첫 번째 입력 필드로 포커스
        const firstInput = newPeriod.querySelector('.start-date');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * 기간 요소 생성
     */
    createPeriodElement(periodNumber) {
        const newPeriod = document.createElement('div');
        newPeriod.className = 'period-group';
        newPeriod.setAttribute('data-period', periodNumber);
        newPeriod.innerHTML = `
            <span class="period-label">${periodNumber}회차</span>
            <div class="form-group">
                <label for="start-date-${periodNumber}">시작일</label>
                <input type="date" id="start-date-${periodNumber}" class="start-date" required aria-describedby="start-date-help-${periodNumber}">
                <div id="start-date-help-${periodNumber}" class="sr-only">육아휴직 시작 날짜를 선택하세요</div>
            </div>
            <div class="form-group">
                <label for="end-date-${periodNumber}">종료일</label>
                <input type="date" id="end-date-${periodNumber}" class="end-date" required aria-describedby="end-date-help-${periodNumber}">
                <div id="end-date-help-${periodNumber}" class="sr-only">육아휴직 종료 날짜를 선택하세요</div>
            </div>
            <button type="button" class="remove-btn" onclick="parentalLeaveCalc.removePeriod(this)" aria-label="${periodNumber}회차 기간 삭제">삭제</button>
        `;
        return newPeriod;
    }

    /**
     * 법정한도 초과 표시
     */
    markPeriodAsExceeded(periodElement, periodNumber) {
        periodElement.classList.add('exceeds-limit');
        const label = periodElement.querySelector('.period-label');
        if (label) {
            label.classList.add('error');
            label.innerHTML = `${periodNumber}회차 <span class="limit-notice">(법정한도 초과)</span>`;
        }
    }

    /**
     * 기간 삭제
     */
    removePeriod(button) {
        if (!button) return;
        
        const periodGroup = button.closest('.period-group');
        if (!periodGroup) return;

        // 확인 다이얼로그
        UIComponents.confirm(
            '이 기간을 삭제하시겠습니까?',
            () => {
                periodGroup.remove();
                this.updatePeriodLabels();
                this.updateRemoveButtons();
                this.checkRealTimeOverlap();

                // 분석 이벤트 추적
                if (typeof calculatorPlatform !== 'undefined') {
                    calculatorPlatform.trackEvent('remove_period', 'calculator', 'parental_leave');
                }
            }
        );
    }

    /**
     * 기간 라벨 업데이트
     */
    updatePeriodLabels() {
        const periods = document.querySelectorAll('.period-group');
        periods.forEach((period, index) => {
            const label = period.querySelector('.period-label');
            const periodNumber = index + 1;
            
            // ID 업데이트
            this.updatePeriodIds(period, periodNumber);
            
            // 스타일 및 라벨 업데이트
            if (periodNumber > 3) {
                this.markPeriodAsExceeded(period, periodNumber);
            } else {
                period.className = 'period-group';
                label.className = 'period-label';
                label.textContent = `${periodNumber}회차`;
            }
            
            period.setAttribute('data-period', periodNumber);
        });
        this.periodCount = periods.length;
    }

    /**
     * 기간별 ID 업데이트
     */
    updatePeriodIds(period, periodNumber) {
        const startInput = period.querySelector('.start-date');
        const endInput = period.querySelector('.end-date');
        const removeBtn = period.querySelector('.remove-btn');
        
        if (startInput) {
            startInput.id = `start-date-${periodNumber}`;
            const startLabel = period.querySelector('label[for^="start-date"]');
            if (startLabel) startLabel.setAttribute('for', `start-date-${periodNumber}`);
        }
        
        if (endInput) {
            endInput.id = `end-date-${periodNumber}`;
            const endLabel = period.querySelector('label[for^="end-date"]');
            if (endLabel) endLabel.setAttribute('for', `end-date-${periodNumber}`);
        }
        
        if (removeBtn) {
            removeBtn.setAttribute('aria-label', `${periodNumber}회차 기간 삭제`);
        }
    }

    /**
     * 삭제 버튼 상태 업데이트
     */
    updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => {
            btn.style.display = this.periodCount > 1 ? 'block' : 'none';
        });
    }

    /**
     * 기간 계산 실행
     */
    calculatePeriods() {
        const periods = document.querySelectorAll('.period-group');
        let totalUsage = 0;
        const results = [];
        const validPeriods = [];

        // 로딩 표시
        const resultContainer = document.getElementById('resultContainer');
        const loading = UIComponents.showLoading(resultContainer);

        setTimeout(() => {
            try {
                // 유효한 기간 수집
                periods.forEach((period, index) => {
                    const startDateInput = period.querySelector('.start-date').value;
                    const endDateInput = period.querySelector('.end-date').value;
                    
                    if (!startDateInput || !endDateInput) return;
                    
                    const startDate = new Date(startDateInput);
                    const endDate = new Date(endDateInput);
                    
                    if (startDate > endDate) {
                        UIComponents.showToast(`❌ ${index + 1}회차 날짜 오류: 종료일이 시작일보다 빠름`, 'error');
                        return;
                    }

                    validPeriods.push({
                        index: index + 1,
                        startDate: startDate,
                        endDate: endDate
                    });
                });

                if (validPeriods.length === 0) {
                    UIComponents.showToast('입력 오류: 최소 하나의 기간을 입력해주세요.', 'error');
                    return;
                }

                if (this.currentOverlapStatus) {
                    UIComponents.showToast('기간 겹침 오류: ' + this.currentOverlapMessage, 'error');
                    return;
                }

                // 기간별 계산 수행
                validPeriods.forEach((period) => {
                    const result = this.calculatePeriodUsage(period.startDate, period.endDate);
                    results.push(result);
                    totalUsage += result.totalMonths;
                });

                // 결과 표시
                this.displayResults(totalUsage);
                this.calculateRemainingPeriods(totalUsage);
                
                // 전역 변수에 저장
                this.totalUsedMonths = totalUsage;

                // 분석 이벤트 추적
                if (typeof calculatorPlatform !== 'undefined') {
                    calculatorPlatform.trackEvent('calculate_periods', 'calculator', 'parental_leave', Math.round(totalUsage * 100));
                }

                // 결과로 스크롤
                resultContainer.scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error('계산 중 오류:', error);
                UIComponents.showToast('계산 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            } finally {
                UIComponents.hideLoading(resultContainer);
            }
        }, 300); // 사용자 경험을 위한 약간의 지연
    }

    /**
     * 개별 기간 사용량 계산
     */
    calculatePeriodUsage(startDate, endDate) {
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

        const months = this.getMonthsDifference(startDate, adjustedEndDate);
        
        const tempDate = new Date(startDate);
        tempDate.setMonth(tempDate.getMonth() + months);
        
        let remainingDays = 0;
        if (adjustedEndDate > tempDate) {
            remainingDays = Math.floor((adjustedEndDate - tempDate) / (1000 * 60 * 60 * 24));
        }

        let daysInMonth = 30;
        let dailyRatio = 0;
        
        if (remainingDays > 0) {
            const calcStartDate = new Date(tempDate);
            const calcEndDate = new Date(tempDate);
            calcEndDate.setMonth(calcEndDate.getMonth() + 1);
            calcEndDate.setDate(calcEndDate.getDate() - 1);
            
            daysInMonth = Math.floor((calcEndDate - calcStartDate) / (1000 * 60 * 60 * 24)) + 1;
            dailyRatio = Math.floor((remainingDays / daysInMonth) * 1000) / 1000;
        }
        
        const totalMonths = Math.floor((months + dailyRatio) * 1000) / 1000;

        return {
            months: months,
            days: remainingDays,
            dailyRatio: dailyRatio.toFixed(3),
            totalMonths: totalMonths,
            daysInMonth: daysInMonth
        };
    }

    /**
     * 개월 수 차이 계산
     */
    getMonthsDifference(startDate, endDate) {
        let months = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        months = (end.getFullYear() - start.getFullYear()) * 12;
        months += end.getMonth() - start.getMonth();
        
        if (end.getDate() < start.getDate()) {
            months--;
        }
        
        return Math.max(0, months);
    }

    /**
     * 결과 표시
     */
    displayResults(totalUsage) {
        const usedMonthsForDisplay = Math.floor(totalUsage);
        const usedDaysForDisplay = Math.round((totalUsage - usedMonthsForDisplay) * 30);
        
        let totalPeriodText = '';
        if (usedMonthsForDisplay === 0) {
            totalPeriodText = `${usedDaysForDisplay}일 (${totalUsage.toFixed(2)}개월)`;
        } else if (usedDaysForDisplay === 0) {
            totalPeriodText = `${usedMonthsForDisplay}개월 (${totalUsage.toFixed(2)}개월)`;
        } else {
            totalPeriodText = `${usedMonthsForDisplay}개월 ${usedDaysForDisplay}일 (${totalUsage.toFixed(2)}개월)`;
        }
        
        const totalPeriodElement = document.getElementById('totalPeriod');
        const resultContainer = document.getElementById('resultContainer');
        const resultTitle = document.getElementById('result-title');
        
        if (totalPeriodElement) {
            totalPeriodElement.textContent = totalPeriodText;
        }
        
        if (resultContainer) {
            resultContainer.style.display = 'block';
            resultContainer.classList.add('show');
        }
        
        if (resultTitle) {
            resultTitle.style.display = 'block';
        }

        // 접근성: 스크린 리더에 결과 알림
        this.announceToScreenReader(`계산이 완료되었습니다. 총 사용기간은 ${totalPeriodText}입니다.`);
    }

    /**
     * 잔여기간 계산
     */
    calculateRemainingPeriods(totalUsedMonths) {
        const remaining12 = Math.max(0, 12 - totalUsedMonths);
        const remaining12Months = Math.floor(remaining12);
        const remaining12Days = Math.round((remaining12 - remaining12Months) * 30);
        
        const remaining18 = Math.max(0, 18 - totalUsedMonths);
        const remaining18Months = Math.floor(remaining18);
        const remaining18Days = Math.round((remaining18 - remaining18Months) * 30);
        
        // 텍스트 생성
        const remaining12Text = this.formatRemainingPeriod(remaining12, remaining12Months, remaining12Days, '1년');
        const remaining18Text = this.formatRemainingPeriod(remaining18, remaining18Months, remaining18Days, '1년 6개월');
        
        // 요약 표시
        const cardSummary = `1년 기준: ${remaining12Text}<br/>1년 6개월 기준: ${remaining18Text}`;
        
        const remainingSummaryElement = document.getElementById('remainingSummary');
        const remainingResultElement = document.getElementById('remainingPeriodResult');
        
        if (remainingSummaryElement) {
            remainingSummaryElement.innerHTML = cardSummary;
        }
        
        if (remainingResultElement) {
            remainingResultElement.style.display = 'block';
        }
    }

    /**
     * 잔여기간 포맷팅
     */
    formatRemainingPeriod(remaining, months, days, basePeriod) {
        if (remaining <= 0) {
            return `${basePeriod} 한도 초과`;
        } else if (months === 0) {
            return `${days}일 (${remaining.toFixed(2)}개월)`;
        } else if (days === 0) {
            return `${months}개월 (${remaining.toFixed(2)}개월)`;
        } else {
            return `${months}개월 ${days}일 (${remaining.toFixed(2)}개월)`;
        }
    }

    /**
     * 모의계산 실행
     */
    calculateSimulation() {
        const startDateInput = document.getElementById('simulationStartDate');
        const startDate = startDateInput?.value;
        
        if (!startDate) {
            UIComponents.showToast('입력 오류: 예상 시작일을 입력해주세요.', 'error');
            startDateInput?.focus();
            return;
        }

        if (typeof this.totalUsedMonths === 'undefined' || this.totalUsedMonths === 0) {
            UIComponents.showToast('계산 오류: 먼저 사용기간을 계산해주세요.', 'error');
            return;
        }

        const remaining12Months = Math.max(0, 12 - this.totalUsedMonths);
        const remaining18Months = Math.max(0, 18 - this.totalUsedMonths);
        const simulationStart = new Date(startDate);
        
        this.updateSimulationDetail(simulationStart, remaining12Months, remaining18Months);
        
        UIComponents.showToast('모의계산이 완료되었습니다.', 'success');

        // 분석 이벤트 추적
        if (typeof calculatorPlatform !== 'undefined') {
            calculatorPlatform.trackEvent('simulate_remaining', 'calculator', 'parental_leave');
        }
    }

    /**
     * 모의계산 상세 정보 업데이트
     */
    updateSimulationDetail(startDate, remaining12, remaining18) {
        const detailContent = document.getElementById('simulationDetailContent');
        if (!detailContent) return;
        
        let detailHTML = '';
        
        if (remaining12 > 0) {
            const endDate12 = this.calculateEndDate(startDate, remaining12);
            const startDateStr = CalculatorUtils.formatDateKorean(startDate);
            const endDateStr = CalculatorUtils.formatDateKorean(endDate12);
            
            detailHTML += `<div class="date-range primary" style="margin-bottom: 12px;">
                <strong style="color: #2b6cb0;">1년 기준: ${startDateStr}부터 ${endDateStr}까지 사용 가능</strong>
            </div>`;
        } else {
            detailHTML += `<div class="date-range danger" style="margin-bottom: 12px;">
                <strong>1년 기준: 한도 초과로 추가 사용 불가</strong>
            </div>`;
        }
        
        if (remaining18 > 0) {
            const endDate18 = this.calculateEndDate(startDate, remaining18);
            const startDateStr = CalculatorUtils.formatDateKorean(startDate);
            const endDateStr = CalculatorUtils.formatDateKorean(endDate18);
            
            detailHTML += `<div class="date-range">
                <strong style="color: #38a169;">1년 6개월 기준: ${startDateStr}부터 ${endDateStr}까지 사용 가능</strong>
            </div>`;
        } else {
            detailHTML += `<div class="date-range danger">
                <strong>1년 6개월 기준: 한도 초과로 추가 사용 불가</strong>
            </div>`;
        }
        
        detailContent.innerHTML = detailHTML;
        document.getElementById('simulationDetail').style.display = 'block';
    }

    /**
     * 종료일 계산
     */
    calculateEndDate(startDate, remainingMonths) {
        const months = Math.floor(remainingMonths);
        const days = Math.round((remainingMonths - months) * 30);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        endDate.setDate(endDate.getDate() + days);
        return endDate;
    }

    /**
     * 실시간 날짜 겹침 검사
     */
    checkRealTimeOverlap() {
        const periods = document.querySelectorAll('.period-group');
        const validPeriods = [];
        const warningDiv = document.getElementById('overlapWarning');

        // 유효한 기간 수집
        periods.forEach((period, index) => {
            const startDateInput = period.querySelector('.start-date').value;
            const endDateInput = period.querySelector('.end-date').value;
            
            if (startDateInput && endDateInput) {
                const startDate = new Date(startDateInput);
                const endDate = new Date(endDateInput);
                
                if (startDate <= endDate) {
                    validPeriods.push({
                        index: index + 1,
                        startDate: startDate,
                        endDate: endDate,
                        element: period
                    });
                }
            }
        });

        // 스타일 초기화
        validPeriods.forEach(period => {
            period.element.classList.remove('error');
            if (period.index <= 3) {
                period.element.style.borderColor = '#e2e8f0';
                period.element.style.boxShadow = 'none';
            }
        });

        // 겹침 검사
        let hasOverlap = false;
        let overlapMessage = '';
        const sortedPeriods = validPeriods.sort((a, b) => a.startDate - b.startDate);

        for (let i = 0; i < sortedPeriods.length - 1; i++) {
            const currentPeriod = sortedPeriods[i];
            const nextPeriod = sortedPeriods[i + 1];
            
            if (currentPeriod.endDate >= nextPeriod.startDate) {
                hasOverlap = true;
                
                // 에러 스타일 적용
                currentPeriod.element.classList.add('error');
                nextPeriod.element.classList.add('error');
                
                if (!overlapMessage) {
                    overlapMessage = `${currentPeriod.index}회차와 ${nextPeriod.index}회차의 기간이 겹칩니다.`;
                }
            }
        }

        // 경고 메시지 표시/숨김
        if (warningDiv) {
            if (hasOverlap) {
                warningDiv.style.display = 'block';
                warningDiv.classList.add('show');
                warningDiv.textContent = `⚠️ ${overlapMessage} 날짜를 확인해주세요.`;
            } else {
                warningDiv.style.display = 'none';
                warningDiv.classList.remove('show');
            }
        }

        // 상태 저장
        this.currentOverlapStatus = hasOverlap;
        this.currentOverlapMessage = overlapMessage;
        
        return !hasOverlap;
    }

    /**
     * 날짜 입력 유효성 검증
     */
    validateDateInputs(startInput, endInput) {
        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);
        
        if (startInput.value && endInput.value && startDate > endDate) {
            endInput.classList.add('error');
            endInput.focus();
            
            // 3초 후 스타일 복구
            setTimeout(() => {
                endInput.classList.remove('error');
            }, 3000);
            
            return false;
        }
        return true;
    }

    /**
     * 날짜 변경 이벤트 리스너 추가
     */
    addDateChangeListeners() {
        const periods = document.querySelectorAll('.period-group');
        
        periods.forEach(period => {
            const startInput = period.querySelector('.start-date');
            const endInput = period.querySelector('.end-date');
            
            if (startInput && endInput) {
                // 기존 이벤트 리스너 제거 (중복 방지)
                startInput.removeEventListener('change', this.handleDateChange.bind(this));
                endInput.removeEventListener('change', this.handleDateChange.bind(this));
                
                // 새 이벤트 리스너 추가
                startInput.addEventListener('change', this.handleDateChange.bind(this));
                endInput.addEventListener('change', this.handleDateChange.bind(this));
            }
        });
    }

    /**
     * 날짜 변경 핸들러
     */
    handleDateChange(event) {
        try {
            const period = event.target.closest('.period-group');
            if (!period) return;
            
            const startInput = period.querySelector('.start-date');
            const endInput = period.querySelector('.end-date');
            
            if (!startInput || !endInput) return;
            
            // 날짜 유효성 검증
            if (!this.validateDateInputs(startInput, endInput)) {
                return;
            }
            
            // 실시간 겹침 검사 (디바운스 적용)
            this.debouncedOverlapCheck = this.debouncedOverlapCheck || 
                CalculatorUtils.debounce(() => this.checkRealTimeOverlap(), 300);
            this.debouncedOverlapCheck();
            
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
        const periods = [];
        document.querySelectorAll('.period-group').forEach((period, index) => {
            const startDate = period.querySelector('.start-date').value;
            const endDate = period.querySelector('.end-date').value;
            
            if (startDate && endDate) {
                periods.push({
                    sequence: index + 1,
                    startDate: startDate,
                    endDate: endDate
                });
            }
        });

        const data = {
            calculationType: 'parental_leave',
            periods: periods,
            totalUsedMonths: this.totalUsedMonths,
            calculatedAt: new Date().toISOString(),
            url: window.location.href
        };

        return data;
    }

    /**
     * 데이터 가져오기 (선택사항)
     */
    importData(data) {
        if (!data || !data.periods) return false;

        try {
            // 기존 기간 제거
            const container = document.getElementById('periodsContainer');
            container.innerHTML = '';
            this.periodCount = 0;

            // 새 기간 추가
            data.periods.forEach((period, index) => {
                if (index === 0) {
                    // 첫 번째 기간은 기본 템플릿 사용
                    this.periodCount = 1;
                    const firstPeriod = this.createPeriodElement(1);
                    container.appendChild(firstPeriod);
                } else {
                    this.addPeriod();
                }

                // 값 설정
                const currentPeriod = container.children[index];
                currentPeriod.querySelector('.start-date').value = period.startDate;
                currentPeriod.querySelector('.end-date').value = period.endDate;
            });

            this.addDateChangeListeners();
            UIComponents.showToast('데이터를 성공적으로 불러왔습니다.', 'success');
            return true;
        } catch (error) {
            console.error('데이터 가져오기 오류:', error);
            UIComponents.showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }
}

// 전역 인스턴스 생성
let parentalLeaveCalc;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    parentalLeaveCalc = new ParentalLeaveCalculator();
    
    // 전역 함수 바인딩 (하위 호환성)
    window.addPeriod = () => parentalLeaveCalc.addPeriod();
    window.removePeriod = (button) => parentalLeaveCalc.removePeriod(button);
    window.calculatePeriods = () => parentalLeaveCalc.calculatePeriods();
    window.calculateSimulation = () => parentalLeaveCalc.calculateSimulation();
});

// 모듈 노출
window.ParentalLeaveCalculator = ParentalLeaveCalculator;