# AWS 배포 가이드

## 🛠️ 필요한 프로그램 및 도구

### 필수 도구

1. **SSH 클라이언트**
   - **Windows PowerShell** (기본 내장) - 추천 ✅
   - 또는 **PuTTY** (https://www.putty.org/)
   - 또는 **Windows Terminal** (Microsoft Store에서 다운로드)

2. **SCP (파일 전송)**
   - **PowerShell** (기본 내장) - `scp` 명령어 사용
   - 또는 **WinSCP** (GUI, https://winscp.net/) - 초보자 추천
   - 또는 **FileZilla** (SFTP 지원, https://filezilla-project.org/)

3. **Git** (코드 버전 관리 및 배포)
   - https://git-scm.com/download/win
   - 설치 후 Git Bash 또는 PowerShell에서 사용

4. **텍스트 에디터** (서버에서 설정 파일 편집용)
   - **Nano** (EC2에 이미 설치됨)
   - 또는 **VS Code + Remote SSH 확장** (로컬에서 서버 파일 편집 가능)

### 선택 도구

5. **AWS CLI** (선택사항)
   - https://aws.amazon.com/cli/
   - AWS 서비스 관리 자동화

6. **PM2** (Node.js 프로세스 관리)
   - EC2에서 `npm install -g pm2`로 설치
   - 서버 재시작 시 자동 실행

---

## 🏗️ AWS 인프라 구성

### 옵션 1: 단일 EC2 인스턴스 (간단, 비용 절감)
- 1개 EC2: 프론트엔드 + 백엔드 + MySQL 모두 설치
- 추천: t3.small 이상 (2GB RAM 이상)

### 옵션 2: 분리 구성 (프로덕션 권장)
- EC2 인스턴스 2개:
  - **프론트엔드 EC2**: React 빌드 파일 + Nginx
  - **백엔드 EC2**: Node.js Express + Nginx (리버스 프록시)
- **RDS**: MySQL 데이터베이스 (관리형)
  - 또는 EC2에 MySQL 직접 설치

---

## 📋 배포 단계 요약

### 0단계: Route 53에서 도메인 설정

#### 도메인 호스팅 영역 생성

1. AWS 콘솔 → Route 53 서비스 접속
2. 왼쪽 메뉴 → "호스팅 영역" 클릭
3. "호스팅 영역 생성" 버튼 클릭
4. 설정:
   - **도메인 이름**: `yourdomain.com` (예: `capstone.com`)
   - **유형**: 공용 호스팅 영역
   - "호스팅 영역 생성" 클릭

#### 레코드 생성

생성된 호스팅 영역에서 레코드 추가:

**A 레코드 (프론트엔드):**
- 레코드 이름: `www` (또는 비워두면 루트 도메인)
- 레코드 유형: `A - 라우팅 트래픽을 IPv4 주소와 일부 AWS 리소스로`
- 별칭: 활성화
- 별칭 대상: Application Load Balancer 또는 CloudFront 선택
  - **또는** EC2 인스턴스의 퍼블릭 IP 직접 입력 (별칭 비활성화)
- 라우팅 정책: 단순 라우팅
- "레코드 생성" 클릭

**A 레코드 (백엔드 API):**
- 레코드 이름: `api` (또는 `backend`)
- 레코드 유형: `A`
- 값: 백엔드 EC2 인스턴스의 퍼블릭 IP
- TTL: 300
- "레코드 생성" 클릭

**참고**: 
- EC2 인스턴스의 퍼블릭 IP는 EC2 대시보드에서 확인 가능
- Elastic IP를 사용하면 IP 변경 방지 (권장)
- 도메인 전파 시간: 5분 ~ 48시간 (보통 1시간 이내)

#### Elastic IP 할당 (권장 - IP 변경 방지)

1. EC2 대시보드 → 왼쪽 메뉴 → "Elastic IP"
2. "Elastic IP 주소 할당" 클릭
3. 설정:
   - 네트워크 경계 그룹: 기본값
   - 퍼블릭 IPv4 주소 풀: Amazon의 IPv4 주소 풀
4. "할당" 클릭
5. 할당된 IP 선택 → "작업" → "Elastic IP 주소 연결"
6. 인스턴스와 프라이빗 IP 선택 → "연결"
7. Route 53 레코드에서 이 Elastic IP를 사용

---

### 1단계: AWS EC2 인스턴스 생성

1. AWS 콘솔 로그인 (https://aws.amazon.com/)
2. EC2 대시보드 → "인스턴스 시작"
3. 설정:
   - **AMI**: Amazon Linux 2023 (무료 티어)
   - **인스턴스 유형**: t3.micro (무료 티어) 또는 t3.small
   - **키 페어**: 새 키 페어 생성 또는 기존 키 사용
     - ⚠️ **주의**: `.pem` 파일 다운로드 필수! 분실 시 접속 불가
   - **네트워크 설정**: 
     - 보안 그룹 생성 또는 기존 그룹 선택
     - HTTP (80), HTTPS (443), SSH (22) 포트 열기
     - MySQL (3306) - 백엔드 EC2에만 필요
   - **스토리지**: 기본값 (8GB) 또는 필요에 따라 증가
4. 인스턴스 시작
5. **Elastic IP 할당** (위 Route 53 설정 참고)

### 2단계: EC2 접속 (SSH)

#### Windows PowerShell 사용:
```powershell
# 키 파일 권한 설정 (처음 한 번만)
icacls "C:\path\to\your-key.pem" /inheritance:r
icacls "C:\path\to\your-key.pem" /grant:r "%username%:R"

# SSH 접속
ssh -i "C:\path\to\your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

#### 키 파일 권한 오류 발생 시:
- 키 파일 우클릭 → 속성 → 보안 탭 → 고급
- 상속 사용 안 함 → 모든 사용자 제거
- 현재 사용자만 읽기 권한 추가

### 3단계: EC2에 필요한 소프트웨어 설치

```bash
# 시스템 업데이트
sudo dnf update -y

# Node.js 설치 (Amazon Linux 2023)
sudo dnf install nodejs npm -y
node --version  # 확인

# MySQL 설치 (백엔드 서버에만)
sudo dnf install mysql-server -y
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Nginx 설치
sudo dnf install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Certbot 설치 (HTTPS 인증서용)
sudo dnf install certbot python3-certbot-nginx -y

# Git 설치
sudo dnf install git -y

# PM2 설치 (Node.js 프로세스 관리)
sudo npm install -g pm2
```

### 4단계: 코드 배포

#### 방법 A: Git 사용 (권장)

```bash
# EC2에서
cd /home/ec2-user
git clone YOUR_REPOSITORY_URL
cd capstone

# 프론트엔드 빌드 (로컬에서 먼저 빌드하거나 EC2에서)
cd /home/ec2-user/capstone
npm install
npm run build

# 백엔드 설정
cd /home/ec2-user/capstone/backend
npm install
```

#### 방법 B: SCP로 파일 전송 (로컬에서)

```powershell
# 프론트엔드 빌드 파일 전송
scp -i "C:\path\to\your-key.pem" -r build/* ec2-user@YOUR_EC2_IP:/var/www/html

# 백엔드 소스코드 전송
scp -i "C:\path\to\your-key.pem" -r backend/* ec2-user@YOUR_EC2_IP:/home/ec2-user/backend
```

### 5단계: 데이터베이스 설정

```bash
# MySQL 접속
sudo mysql -u root

# 데이터베이스 생성
CREATE DATABASE capstone DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
EXIT;

# 덤프 파일 업로드 (로컬에서)
# scp -i "your-key.pem" dump-capstone-clean-final.sql ec2-user@YOUR_EC2_IP:/home/ec2-user/

# 덤프 파일 import (EC2에서)
mysql -u root -p capstone < /home/ec2-user/dump-capstone-clean-final.sql
```

### 6단계: 환경 변수 설정

```bash
# 백엔드 .env 파일 생성
cd /home/ec2-user/capstone/backend
nano .env
```

**프론트엔드 환경 변수** (로컬에서 빌드 전에 설정):
프로젝트 루트에 `.env` 파일 생성 (또는 `.env.production`)

```env
REACT_APP_API_BASE=https://api.yourdomain.com
```

**백엔드 .env 파일**:

```env
# 데이터베이스 연결 설정
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=capstone

# 서버 설정
PORT=5000
BASE_URL=https://api.yourdomain.com

# JWT 시크릿 키 (운영 환경에서 반드시 변경!)
JWT_SECRET=your-production-secret-key-here

# 세션 시크릿 (운영 환경에서 반드시 변경!)
SESSION_SECRET=your-production-session-secret-here
```

**중요**: 
- Route 53에서 설정한 도메인을 BASE_URL에 입력
- 프론트엔드: `www.yourdomain.com` 또는 `yourdomain.com`
- 백엔드: `api.yourdomain.com`

### 7단계: Nginx 설정

#### 프론트엔드 Nginx 설정

```bash
sudo nano /etc/nginx/nginx.conf
```

**Route 53에 설정한 도메인으로 변경**:

```nginx
server {
    listen 80;
    server_name www.yourdomain.com yourdomain.com;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        root /var/www/html;
    }

    # 이미지 및 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf)$ {
        root /var/www/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**또는 여러 도메인 사용 시**:

```nginx
server {
    listen 80;
    server_name www.yourdomain.com yourdomain.com *.yourdomain.com;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 백엔드 Nginx 설정 (리버스 프록시)

```bash
sudo nano /etc/nginx/conf.d/api.conf
```

**Route 53에 설정한 백엔드 도메인으로 변경**:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 파일 업로드 크기 제한
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_pass_header Set-Cookie;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 정적 파일 직접 서빙 (이미지, PDF 등)
    location /images/ {
        alias /var/www/html/images/;
        expires 1y;
        add_header Cache-Control "public";
    }

    location /ebooks/ {
        alias /var/www/html/ebooks/;
        # 전자책은 인증 후 접근하므로 캐싱 최소화
        expires 1h;
        add_header Cache-Control "private";
    }
}
```

```bash
# Nginx 설정 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

### 8단계: HTTPS 인증서 발급 (Let's Encrypt)

**Route 53 도메인으로 인증서 발급**:

```bash
# 프론트엔드 도메인 인증서 발급
sudo certbot --nginx -d www.yourdomain.com -d yourdomain.com

# 백엔드 도메인 인증서 발급 (별도 EC2인 경우)
sudo certbot --nginx -d api.yourdomain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 확인 (시스템에 타이머 설정됨)
sudo systemctl status certbot.timer
```

**인증서 발급 후 Nginx 자동 설정 확인**:

Certbot이 자동으로 Nginx 설정을 업데이트합니다:
- HTTP (80) → HTTPS (443) 리다이렉트
- SSL 인증서 경로 설정

설정 확인:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 9단계: 백엔드 서버 실행

#### PM2 사용 (권장 - 서버 재시작 시 자동 실행)

```bash
cd /home/ec2-user/capstone/backend
pm2 start server.js --name "capstone-backend"
pm2 save
pm2 startup  # 시스템 재시작 시 자동 실행 설정
```

#### 또는 직접 실행 (임시)

```bash
cd /home/ec2-user/capstone/backend
node server.js
```

---

## 🔧 자주 발생하는 문제 해결

### 1. 키 파일 권한 오류
```
WARNING: UNPROTECTED PRIVATE KEY FILE!
```
**해결**: 키 파일 속성 → 보안 → 고급 → 상속 사용 안 함 → 읽기 권한만 부여

### 2. 파일 권한 오류 (403 Forbidden)
```bash
sudo chmod -R 755 /var/www/html
sudo chown -R nginx:nginx /var/www/html
```

### 3. MySQL 연결 실패
- `.env` 파일의 DB_PASSWORD 확인
- MySQL이 실행 중인지 확인: `sudo systemctl status mysqld`
- 방화벽 확인 (보안 그룹에서 3306 포트 열기)

### 4. Nginx 502 Bad Gateway
- 백엔드 서버가 실행 중인지 확인
- 포트 번호 확인 (5000번 포트)
- PM2로 실행: `pm2 list`
- Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`

### 6. 도메인 연결 안 됨 (Route 53)
```bash
# 도메인 DNS 확인
nslookup yourdomain.com
# 또는
dig yourdomain.com

# Route 53에서 레코드 확인
# - 레코드 타입이 올바른지 (A 레코드)
# - 값이 올바른 IP인지 확인
# - TTL이 적절한지 (300초 권장)
```

### 7. HTTPS 인증서 발급 실패
- 도메인이 올바르게 DNS에 전파되었는지 확인
- Nginx가 80 포트에서 실행 중인지 확인
- 방화벽에서 80, 443 포트가 열려있는지 확인
- Certbot 로그 확인: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

### 5. CORS 오류
- `backend/server.js`에서 CORS 설정 확인
- 프론트엔드 도메인 추가 (Route 53 도메인 포함)

```javascript
// backend/server.js 수정 예시
const corsOptions = {
  origin: [
    'http://localhost:3000',  // 개발 환경
    'https://www.yourdomain.com',  // 프로덕션 프론트엔드
    'https://yourdomain.com'  // 루트 도메인
  ],
  credentials: true,
};
```

---

## 📝 체크리스트

배포 전 확인사항:
- [ ] Route 53에서 도메인 호스팅 영역 생성
- [ ] Route 53에서 A 레코드 설정 (프론트엔드, 백엔드)
- [ ] Elastic IP 할당 및 연결 (IP 변경 방지)
- [ ] EC2 인스턴스 생성 완료
- [ ] 보안 그룹 설정 (HTTP, HTTPS, SSH, MySQL)
- [ ] 도메인 DNS 전파 확인 (nslookup 또는 dig 명령어)
- [ ] .env 파일 설정 (프로덕션 환경 변수, Route 53 도메인 포함)
- [ ] 프론트엔드 REACT_APP_API_BASE 환경 변수 설정
- [ ] 데이터베이스 덤프 import 완료
- [ ] Nginx 설정 완료 (Route 53 도메인으로 변경)
- [ ] HTTPS 인증서 발급 완료 (Let's Encrypt)
- [ ] PM2로 백엔드 서버 실행
- [ ] 프론트엔드 빌드 파일 업로드
- [ ] CORS 설정 확인 (백엔드 server.js)
- [ ] 테스트 (로그인, 주문, 전자책 등)

---

## 🚀 추천 배포 워크플로우

1. **로컬에서 테스트 완료**
2. **Git에 커밋 및 푸시**
3. **EC2에서 Git Pull**
4. **프론트엔드 빌드**: `npm run build`
5. **빌드 파일 복사**: `cp -r build/* /var/www/html`
6. **백엔드 재시작**: `pm2 restart capstone-backend`
7. **Nginx 재시작**: `sudo systemctl reload nginx`

---

## 📚 유용한 명령어

```bash
# PM2 명령어
pm2 list              # 실행 중인 프로세스 목록
pm2 logs capstone-backend  # 로그 확인
pm2 restart capstone-backend  # 재시작
pm2 stop capstone-backend     # 중지
pm2 delete capstone-backend   # 삭제

# Nginx 명령어
sudo nginx -t         # 설정 파일 문법 검사
sudo systemctl status nginx  # 상태 확인
sudo systemctl reload nginx  # 재시작

# MySQL 명령어
sudo systemctl status mysqld  # 상태 확인
mysql -u root -p      # 접속
```

---

## 🔐 보안 권장사항

1. **.env 파일**: 절대 Git에 커밋하지 않기
2. **JWT_SECRET**: 운영 환경에서 강력한 랜덤 문자열 사용
3. **MySQL 비밀번호**: 복잡한 비밀번호 설정
4. **SSH 키**: 안전한 위치에 보관
5. **보안 그룹**: 필요한 포트만 열기
6. **정기 업데이트**: `sudo dnf update -y`

---

## 💰 비용 추정 (월)

- **Route 53 호스팅 영역**: $0.50/월 (호스팅 영역당)
- **Route 53 쿼리**: 첫 100만 건 무료, 이후 $0.40/100만 건
- **t3.micro EC2**: 무료 티어 (1년) 또는 ~$8/월
- **t3.small EC2**: ~$15/월
- **Elastic IP**: 인스턴스에 연결되어 있으면 무료 (연결 해제 시 시간당 $0.005)
- **RDS (t3.micro)**: ~$15/월 (선택사항)
- **데이터 전송**: 첫 1GB 무료, 이후 ~$0.09/GB
- **도메인 등록**: Route 53에서 직접 등록 시 ~$12-15/년, 외부에서 등록 시 연간 등록 비용만

**총 예상 비용**: 월 ~$20-45 (무료 티어 사용 시 첫 1년 EC2 무료)

**참고**: 
- Route 53은 매우 저렴하고 안정적인 DNS 서비스
- Let's Encrypt 인증서는 무료
- Elastic IP는 인스턴스에 연결되어 있으면 추가 비용 없음

---

도움이 필요하시면 언제든지 물어보세요! 🚀

