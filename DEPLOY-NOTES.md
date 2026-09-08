# Tomato Kiosk · 운영 옵션 및 결제 흐름 보정 v4.1

## 적용 방법

이 ZIP은 기존 star0301/kioskUI 저장소에 덮어쓰는 소스 업데이트입니다.
기존 저장소의 assets 폴더는 그대로 유지해 주세요.

1. ZIP을 풉니다.
2. index.html이 있는 기존 Git 저장소 루트에 아래 파일을 덮어씁니다.
   - index.html
   - styles.css
   - app.js
   - modals.js (새 파일)
3. 로컬에서 index.html을 열거나 정적 서버로 확인합니다.
4. 변경 파일을 커밋하고 main 브랜치로 푸시합니다.

권장 명령:

    git add index.html styles.css app.js modals.js DEPLOY-NOTES.md
    git commit -m "feat: align kiosk modals with Figma flow"
    git push origin main

GitHub Pages가 main 브랜치에서 배포되도록 이미 설정돼 있다면 푸시 후 자동으로
다시 배포됩니다. 반영 후에는 Ctrl + F5로 캐시를 무시하고 새로고침해 주세요.

## 주요 변경

- 봉투 선택 즉시 장바구니에 담고 선택창 닫기
- 회원 혜택 화면의 뒤로가기 및 회원 로그인 사용 OFF 시 결제 직행
- 상품직접선택 사용 OFF 시 장바구니 전체 폭 확장 및 봉투 버튼 이동
- 휴대폰 회원 포인트 화면 간소화 및 최종 결제금액 강조
- 포인트 입력 문구와 현금 반환 금액 표기 보정
- 휴대폰 회원가입 중복 검사 및 브라우저 저장 회원 재검사
- 결제 자동 전환 대기시간 2초 연장
- 상품 추가 시 카탈로그 재렌더링 제거 및 프리셋 탭 자동 스크롤
