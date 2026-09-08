# Tomato Kiosk · Figma 모달 정밀 구현

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

- 모든 모달을 콘텐츠 기반 높이로 변경
- 03-A 추천 배지, 설명 개행, 숫자키, 휴대폰 입력 슬롯, QR 설치 카드 정밀화
- 회원가입·포인트·결제·완료·예외 모달별 레이아웃 보정
- 자동 할인 상세, 포인트 적립·사용 내역, 현금 반환, 연령 승인 대기 추가
- APP 로그인과 휴대폰 회원의 혜택 적용 범위 분리
- 로그인·간편결제·연령 승인 상태의 물리 바코드 입력 지원
